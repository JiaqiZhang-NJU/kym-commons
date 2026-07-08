//by supergate
#include<cstdio>
#include<iostream>
#include<cmath>
#include<cstring>
using namespace std;
const int maxn=105,inf=1e9;
char s[maxn];
int n,f[maxn][maxn];
bool ok(int l1,int r1,int l2,int r2){
	int cnt1=r1-l1+1,cnt2=r2-l2+1;
	if(cnt1%cnt2!=0)return 0;
	for(int i=l1;i<=r1;i++)
		if(s[i]!=s[(i-l1)%(cnt2)+l2])return 0;
	return 1;
}
int getcnt(int x){return x!=0?log(x)/log(10)+1:1;}
int main(){
	int i,j,k;
	scanf("%s",s+1);
	n=strlen(s+1);
	for(i=1;i<=n;i++)
	    for(j=i;j<=n;j++)f[i][j]=j-i+1;
	for(i=n;i;i--)
	    for(j=i;j<=n;j++)
	    	for(k=j-1;k>=i;k--){
	        	f[i][j]=min(f[i][j],f[i][k]+f[k+1][j]);
	        	if(ok(k+1,j,i,k))f[i][j]=min(f[i][j],f[i][k]+2+getcnt((j-k)/(k-i+1)+1));
			}
	cout<<f[1][n];
}
