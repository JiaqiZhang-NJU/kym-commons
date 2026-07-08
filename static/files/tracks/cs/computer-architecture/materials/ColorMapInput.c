/*********************
**  Color Map generator
** Skeleton by Justin Yokota
**********************/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#include "ColorMapInput.h"


/**************
**This function reads in a file name colorfile.
**It then uses the information in colorfile to create a color array, with each color represented by an int[3].
***************/
uint8_t** FileToColorMap(char* colorfile, int* colorcount)
{
	FILE* file = fopen(colorfile, "r");

	// if the file can not be open, return null
	if (file == NULL) return NULL;

	fscanf(file, "%d", colorcount);

	uint8_t** colormap = (uint8_t**)malloc(sizeof(uint8_t*) * (*colorcount));
	int i;
	for (i = 0; i < *colorcount; i++) {
		uint8_t* color = (uint8_t*)malloc(sizeof(uint8_t) * 3);
		fscanf(file, "%hhu %hhu %hhu", color, color+1, color+2);
		*(colormap + i) = color;
	}
	fclose(file);
	
	if(i != *colorcount) {
		free(colormap);
		return NULL;
	} else {
		return colormap;
	}
}


