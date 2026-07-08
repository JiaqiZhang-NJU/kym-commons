//by derek
#include<iostream>
#include<cstdio>
using namespace std;
long long mod=1000000007;
long long n,f[105][12],a[12],c[105][105],sum=0;
int main()
{
	scanf("%I64d",&n);
	long long i,j,k;
	for(i=0;i<=n;i++)
	c[i][0]=1;
	for(i=1;i<=n;i++)
	for(j=1;j<=i;j++)
	c[i][j]=(c[i-1][j-1]+c[i-1][j])%mod;
	for(i=0;i<=9;i++)
	scanf("%I64d",&a[i]);
	for(i=a[9];i<=n;i++)
	f[i][9]=1;
	for(j=8;j>=1;j--)
	for(i=a[j];i<=n;i++)
	for(k=a[j];k<=i;k++)
	f[i][j]=(f[i][j]+f[i-k][j+1]*c[i][k])%mod;
	for(i=a[0];i<=n;i++)
	for(k=a[0];k<i;k++)
	f[i][0]=(f[i][0]+f[i-k][1]*c[i-1][k])%mod;
	for(i=a[0];i<=n;i++)
	sum=(sum+f[i][0])%mod;
	printf("%I64d",sum);
	return 0;
}
