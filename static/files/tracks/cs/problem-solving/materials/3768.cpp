#include<cmath>
#include<queue>
#include<vector>
#include<cstdio>
#include<cstring>
#include<cstdlib>
#include<iostream>
#include<algorithm>
#define pa pair<int,int>
#define inf 1000000000
#define eps 1e-8
#define ll long long
using namespace std;
ll read()
{
	ll x=0,f=1;char ch=getchar();
	while(ch<'0'||ch>'9'){if(ch=='-')f=-1;ch=getchar();}
	while(ch>='0'&&ch<='9'){x=x*10+ch-'0';ch=getchar();}
	return x*f;
}
int n,m,top;
int a[1000005],q[1000005];
ll sum[1000005];
void solve(int x)
{
	int ans=0;
	for(int i=1;i<=n;i++)
		sum[i]=sum[i-1]+a[i]-x;
	top=0;
	for(int i=1;i<=n;i++)
		if(sum[q[top]]>sum[i])q[++top]=i;
	for(int i=n,j=top;i>=0;i--)
	{
		while(j&&sum[i]>=sum[q[j-1]])j--;
		ans=max(ans,i-q[j]);
	}
	printf("%d",ans);
}
int main()
{
	n=read();m=read();
	for(int i=1;i<=n;i++)
		a[i]=read();
	while(m--)
	{
		int x=read();
		solve(x);
		if(m)printf(" ");
		else puts("");
	}
	return 0;
}
