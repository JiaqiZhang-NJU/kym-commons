//by hzwer
#include<iostream>
#include<cstdio>
#include<cstdlib>
#include<algorithm>
#include<cmath>
#include<cstring>
#define inf 100000000
#define ll long long 
#define f(a,b,c) (g[a][b][c+8])
using namespace std;
inline int read()
{
    int x=0,f=1;char ch=getchar();
    while(ch<'0'||ch>'9'){if(ch=='-')f=-1;ch=getchar();}
    while(ch>='0'&&ch<='9'){x=x*10+ch-'0';ch=getchar();}
    return x*f;
}
int bin[20];
int T,n;
int t[1005],b[1005];
int g[1005][256][16];
int cal(int x,int y)
{
	if(x==0)return 0;
	return t[x]^t[y];
}
int main()
{
	bin[0]=1;for(int i=1;i<20;i++)bin[i]=bin[i-1]<<1;
	T=read();
	while(T--)
	{
		n=read();
		for(int i=1;i<=n;i++)
			t[i]=read(),b[i]=read();
		for(int i=1;i<=n+1;i++)
			for(int j=0;j<bin[8];j++)
				for(int k=-8;k<=7;k++)
					f(i,j,k)=inf;
		f(1,0,-1)=0;
		for(int i=1;i<=n;i++)
			for(int j=0;j<bin[8];j++)
				for(int k=-8;k<=7;k++)
					if(f(i,j,k)<inf)
					{
						if(j&1)f(i+1,j>>1,k-1)=min(f(i+1,j>>1,k-1),f(i,j,k));
						else 
						{
							int r=inf;
							for(int l=0;l<=7;l++)
								if((j&bin[l])==0)
								{
									if(i+l>r)break;
									r=min(r,i+b[i+l]+l);
									f(i,j+bin[l],l)=min(f(i,j+bin[l],l),f(i,j,k)+cal(i+k,i+l));
								}
						}
					}
		int ans=inf;
		for(int k=-8;k<=-1;k++)
			ans=min(f(n+1,0,k),ans);
		printf("%d\n",ans);
 	}
	return 0;
}
