//by supergate ÏêÇé¼ûPPT 
#include<cstdio>
#include<iostream>
#include<cstring>
using namespace std;
const int maxn=55,inf=1e9;
int n,f[maxn][maxn][2];
char s[maxn];
bool ok(int l,int r){
	int i,mid=(l+r)>>1;
	for(i=l;i<=mid;i++)
	    if(s[i]!=s[mid+i-l+1])return 0;
	return 1;
}
int main(){
	scanf("%s",s+1);
	int i,j,k;
	n=strlen(s+1);
	for(i=n;i;i--)
	    for(j=i;j<=n;j++){
	    	f[i][j][0]=f[i][j][1]=j-i+1;
	    	for(k=i;k<j;k++)f[i][j][1]=min(f[i][j][1],min(f[i][k][0],f[i][k][1])+1+min(f[k+1][j][0],f[k+1][j][1]));
	    	for(k=i;k<j;k++)f[i][j][0]=min(f[i][j][0],f[i][k][0]+j-k);
	    	int mid=(i+j)>>1,t=j-i+1;
	    	if(t%2==0&&ok(i,j))f[i][j][0]=min(f[i][j][0],f[i][mid][0]+1);
	    	if(i==j)f[i][j][1]=inf;
	    }
	cout<<min(f[1][n][0],f[1][n][1]);
}
