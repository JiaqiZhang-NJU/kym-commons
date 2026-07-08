/* 

  基本思想：一共9*9=81个格，每个格如果没有数就for(t=1;t<=9;t++)检查是否可填t，填入、递归，如果搜到了第82层，也就是完成了一个数独，就算一下，更新最大值。搜完后输出最大值。
  但是，采用朴素搜索必超时。
  此处用启发式搜索优化，对于每个为0的格子都有一个取值范围(可放数字的个数), 这个范围由其横行/纵行/小九宫格中已填的数决定, 每次搜索选取值范围最小的格子搜
*/
#include<iostream>
#include<cstdio>
#include<cstdlib>
#include<cstring>
using namespace std; 
typedef  int Cnt[82];      //记录每个为0的格子可以放入的数字的个数
typedef  bool Can[82][10]; //标记每个为0的格子哪些数字是能放入的

const int b[10][10]={      //标记每个格子的得分 
                  {0,0,0,0,0,0 ,0,0,0,0},
                  {0,6,6,6,6,6 ,6,6,6,6},
                  {0,6,7,7,7,7 ,7,7,7,6},
                  {0,6,7,8,8,8 ,8,8,7,6},
                  {0,6,7,8,9,9 ,9,8,7,6},
                  {0,6,7,8,9,10,9,8,7,6},
                  {0,6,7,8,9,9 ,9,8,7,6},
                  {0,6,7,8,8,8 ,8,8,7,6},
                  {0,6,7,7,7,7 ,7,7,7,6},
                  {0,6,6,6,6,6 ,6,6,6,6}
				};

const int a[10][10]={   //将统一小九宫格的格子标记为相同的编号 
  	              {0,0,0,0,0,0,0,0,0,0},
                  {0,1,1,1,2,2,2,3,3,3},
                  {0,1,1,1,2,2,2,3,3,3},
                  {0,1,1,1,2,2,2,3,3,3},
                  {0,4,4,4,5,5,5,6,6,6},
                  {0,4,4,4,5,5,5,6,6,6},
                  {0,4,4,4,5,5,5,6,6,6},
                  {0,7,7,7,8,8,8,9,9,9},
                  {0,7,7,7,8,8,8,9,9,9},
                  {0,7,7,7,8,8,8,9,9,9}
				};

bool h[10][10],v[10][10],z[10][10];   //h,v,z分别标记行、列和小九宫格内已被使用的数字
int node[82][3];                      //记录每个为0的格子的坐标
bool used[82];                        //标记该格子是否已被填入数字
Cnt count;                            //记录每个为0的格子可以放入的数字的个数
Can c;                                //标记每个为0的格子哪些数字是可以放入的
int total,Ans;                        //total记录为0的格子的个数 ,Ans记录得分
bool flag;                            //标记是否成功填满81个格子

void init()//输入及初始化 
{
  int i,j,x,y;
  total=0;
  for(i=1;i<=9;i++)
  {
    for(j=1;j<=9;j++)
    {
      scanf("%d",&x);
      if(x==0)
      {
        total++;  node[total][1]=i; node[total][2]=j;   //记录下为0的格子的坐标，并按1到total编号 
      }
      else
      {
        h[i][x]=true; v[j][x]=true;	z[a[i][j]][x]=true;   //标记受影响的行、列和小九宫格
        Ans=Ans+x*b[i][j];                                //将已填入的数字得分加到总分
      }
    }
  }

  //启发式搜索初始化，统计每个为0的格子可放的数字和数字个数
  for(i=1;i<=total;i++)
  {
    x=node[i][1];
    y=node[i][2];
    for(j=1;j<=9;j++)
    {
      if(h[x][j]||v[y][j]||z[a[x][y]][j]) continue;  //所在行或列或小九宫格内已放入了j，则跳过
      else {  c[i][j]=true;  count[i]++; }           //否则将数字j标记为可放入i号格子，将可放入的个数加1
    }
  }
}

void dfs(int step,int v,Can c,Cnt count)//注意：此处用数组做了参数 
{
  int i,j,k,tmin,x,y;
  Can c1;  Cnt count1;
  bool flag1;
  if(step>total)//所有为0的格子都被填上了数字，也就是找到了一种可行的方案 
  {
    if(v>Ans) Ans=v;
    flag=true;
    return;
  }

  //启发式优化 找出可放入数字最少的格子，从该格子开始往下搜
  tmin=9;
  for(i=1;i<=total;i++)
   if(!used[i])
     if(count[i]>0)
     {
     	if(count[i]<tmin){ tmin=count[i]; k=i; }
     }
     else return;  //若有为0的格子，可填的数字个数为0，果断剪枝。
	  
  //找到编号为k的空格子，从它开始搜索 
  //flag1=false;
  x=node[k][1]; y=node[k][2]; used[k]=true;

  for(i=1;i<=9;i++)             //讨论1到9数字中，哪些可放入k号空格子
    if(c[k][i])                 //如果可以填入数字i 
    {
      flag1=true;               //标记，在k好格子填入数字i是否可行，若填入后，导致其它格子无数字可填，说明该方案不可行 
      memcpy(c1,c,sizeof(c1));  //复制数组，用于还原现场 
      memcpy(count1,count,sizeof(count1));
      for(j=1;j<=total;j++)     //讨论在k号空格子填入数字i后，其他空格的可放入数字会发生的变化
       if(!used[j])
        if((node[j][1]==x)||(node[j][2]==y)||(a[node[j][1]][node[j][2]]==a[x][y])) //如果编号为j的空格子与k号格子同行或同列或同在一小九宫格，则会受其影响
        {
         if(c[j][i]) { count1[j]--;c1[j][i]=false; }   //若j号空格子原来标记的数字i可填，将其改为不可填，同时修改j号格子可填写的数字的个数 
         if(count1[j]==0) { flag1=false;break;}         //剪枝，若有空格子无数字可放入，则该方案不可行，剪掉
        }
      if(flag1) dfs(step+1,v+i*b[x][y],c1,count1);
    }
  used[k]=false;
}
int main() 
{
  init();
  flag=false;
  dfs(1,Ans,c,count);
  if(flag) printf("%d\n",Ans); else printf("-1\n");
}

