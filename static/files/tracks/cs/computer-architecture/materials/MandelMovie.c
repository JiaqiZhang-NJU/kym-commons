/*********************
**  Mandelbrot fractal movie generator
** clang -Xpreprocessor -fopenmp -lomp -o Mandelbrot Mandelbrot.c
** by Dan Garcia <ddgarcia@cs.berkeley.edu>
** Modified for this class by Justin Yokota and Chenyu Shi
**********************/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>
#include "ComplexNumber.h"
#include "Mandelbrot.h"
#include "ColorMapInput.h"
#include <sys/types.h>
#include <string.h>

void printUsage(char* argv[])
{
  printf("Usage: %s <threshold> <maxiterations> <center_real> <center_imaginary> <initialscale> <finalscale> <framecount> <resolution> <output_folder> <colorfile>\n", argv[0]);
  printf("    This program simulates the Mandelbrot Fractal, and creates an iteration map of the given center, scale, and resolution, then saves it in output_file\n");
}


/*
This function calculates the threshold values of every spot on a sequence of frames. The center stays the same throughout the zoom. First frame is at initialscale, and last frame is at finalscale scale.
The remaining frames form a geometric sequence of scales, so 
if initialscale=1024, finalscale=1, framecount=11, then your frames will have scales of 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1.
As another example, if initialscale=10, finalscale=0.01, framecount=5, then your frames will have scale 10, 10 * (0.01/10)^(1/4), 10 * (0.01/10)^(2/4), 10 * (0.01/10)^(3/4), 0.01 .
*/
void MandelMovie(double threshold, u_int64_t max_iterations, ComplexNumber* center, double initialscale, double finalscale, int framecount, u_int64_t resolution, u_int64_t ** output){
    //YOUR CODE HERE
	double scale = initialscale;
	double ratio = pow(finalscale/initialscale, 1.0/(framecount - 1));
	for (int i = 0; i < framecount; i++) {
		Mandelbrot(threshold, max_iterations, center, scale, resolution, *(output + i));
		scale *= ratio;	
	}
	
}

/**************
**This main function converts command line inputs into the format needed to run MandelMovie.
**It then uses the color array from FileToColorMap to create PPM images for each frame, and stores it in output_folder
***************/
int main(int argc, char* argv[])
{
	//Tips on how to get started on main function: 
	//MandelFrame also follows a similar sequence of steps; it may be useful to reference that.
	//Mayke you complete the steps below in order. 

	//STEP 1: Convert command line inputs to local variables, and ensure that inputs are valid.
	/*
	Check the spec for examples of invalid inputs.
	Remember to use your solution to B.1.1 to process colorfile.
	*/

	//YOUR CODE HERE 
	//Usage: %s <threshold> <maxiterations> <center_real> <center_imaginary> <initialscale> <finalscale> <framecount> <resolution> <output_folder> <colorfile>
	if (argc != 11) {
		printf("%s: wrong number of arguments, expecting 10", argv[0]);
		printUsage(argv);
		return 1;
	}
	double threshold, center_real, center_imaginary, initialscale, finalscale;
	u_int64_t maxiterations, resolution;
	int framecount;
	threshold = atof(argv[1]);
	maxiterations = (u_int64_t)atoi(argv[2]);
	center_real = atof(argv[3]);
	center_imaginary = atof(argv[4]);
	initialscale = atof(argv[5]);
	finalscale = atof(argv[6]);
	framecount = atoi(argv[7]);
	resolution = (u_int64_t)atoi(argv[8]);

	if (threshold <= 0 || maxiterations <= 0 || initialscale <= 0 || finalscale <= 0) {
		printf("threshold, maxiterations and scale must be > 0.\n");
		printUsage(argv);
		return 1;
	}

	if (framecount <= 0 || framecount > 10000) {
		printf("framecount must be greater than 0 and less or equal to 10000.\n");
		printUsage(argv);
		return 1;
	}

	if (resolution < 0) {
		printf("resolution must be greater or equal to 0.\n");
		printUsage(argv);
		return 1;
	}

	if (fabs(initialscale - finalscale) < 1e-12 && framecount != 1) {
		printf("if the initialscale is equal to finalscale, the framecount must be 1.\n");
		printUsage(argv);
		return 1;
	}

	u_int64_t size = 2*resolution + 1;

	//STEP 2: Run MandelMovie on the correct arguments.
	/*
	MandelMovie requires an output array, so make sure you allocate the proper amount of space. 
	If allocation fails, free all the space you have already allocated (including colormap), then return with exit code 1.
	*/

	//YOUR CODE HERE 
	ComplexNumber *center = newComplexNumber(center_real, center_imaginary);
	u_int64_t ** frames = (u_int64_t**) malloc(framecount * sizeof(u_int64_t*));
	if (frames == NULL) {
		printf("Unable to allocate %lu bytes\n", framecount * sizeof(u_int64_t*));
		return 1;
	}
	for (int i = 0; i < framecount; i++) {
		*(frames + i) = (u_int64_t*)malloc(size * size * sizeof(u_int64_t));
		if (*(frames + i) == NULL) {
			printf("Unable to allocate %llu bytes\n", size * size * sizeof(u_int64_t));
			return 1;
		}
	}
	MandelMovie(threshold, maxiterations, center, initialscale, finalscale, framecount, resolution, frames);

	//STEP 3: Output the results of MandelMovie to .ppm files.
	/*
	Convert from iteration count to colors, and output the results into output files.
	Use what we showed you in Part B.1.2, create a seqeunce of ppm files in the output folder.
	Feel free to create your own helper function to complete this step.
	As a reminder, we are using P6 format, not P3.
	*/

	//YOUR CODE HERE 
	int *colorcount = (int*)malloc(sizeof(int));
	u_int8_t** colormap;
	colormap = FileToColorMap(argv[10], colorcount);
	if (colormap == NULL) {
		printf("fail to open the color map.\n");
		printUsage(argv);
		return 1;
	}
	
	FILE *outfile;
	char *P6end = "/frame00000.ppm";
	char buffer[strlen(argv[9]) + strlen(P6end)+1];
	uint8_t zero = 0;
	for (int iter = 0; iter < framecount; iter++) {
		u_int64_t *frame = *(frames + iter);
		// create the ppm file name
		sprintf(buffer, "%s/frame%05d.ppm", argv[9], iter);
		outfile = fopen(buffer, "w+");
		if (outfile == NULL) {
			printf("fail to open output file %s\n", buffer);
			printUsage(argv);
			return 1;
		}
		fprintf(outfile, "P6 %llu %llu 255\n", size, size);
		int colorindex;
		//printf(" ===================================\n ");
		for (int i = 0; i < size; i++)
			for (int j = 0; j < size; j++) {
				// change iterations in each pixel into color
				u_int64_t iterations = *(frame + i*size + j);
				//printf("i:%d, j:%d, iteration:%llu\n", i, j, iterations);
				if (iterations == 0) {
					fwrite(&zero, 1, 1, outfile);
					fwrite(&zero, 1, 1, outfile);
					fwrite(&zero, 1, 1, outfile);
				} else {
					colorindex = (iterations - 1) % *colorcount;
					fwrite(*(colormap + colorindex), 1, 3, outfile);
				}
			}
		fclose(outfile);
	}

	//STEP 4: Free all allocated memory
	/*
	Make sure there's no memory leak.
	*/
	//YOUR CODE HERE 
	for (int i = 0; i < (*colorcount); i++) {
		free(*(colormap + i));
	}
	free(colorcount);
	free(colormap);
	for (int i = 0; i < framecount; i++) {
		free(*(frames + i));
	}
	free(frames);
	freeComplexNumber(center);
	return 0;
}

