//by hzwer
#include<cstdio>
#include<algorithm>
using namespace std;
int n,m,k,final,ans;
int mul[20];
int a[1010];
int f[1<<18];
inline int max(int a,int b){return a>b?a:b;}
inline int read()
{
    int x=0,f=1;char ch=getchar();
    while(ch<'0'||ch>'9'){if(ch=='-')f=-1;ch=getchar();}
    while(ch>='0'&&ch<='9'){x=x*10+ch-'0';ch=getchar();}
    return x*f;
}
int main()
{
	n=read();m=read();k=read();
	final=(1<<m)-1;
	for (int i=0;i<=15;i++)mul[i]=(1<<i);
	for (int i=1;i<=n;i++)
	{
		int x=read(),y;
		while (x--)
		{
		  y=read();
		  a[i]+=mul[y-1];
		}
	}
	for (int i=1;i<=n;i++)
	  for (int j=final;j;j--)
	    f[j|a[i]]=max(f[j|a[i]],f[j]+1);
	for (int i=0;i<=final;i++)
	{
	  int tot=0;bool mrk=0;
	  for (int j=1;j<=m;j++)
	    {
	    	if (i&mul[j-1])tot++;
	    	if (tot>k)
	    	{
	    		mrk=1;
	    		break;
	    	}
	    }
	  if (mrk) continue;
	  ans=max(ans,f[i]);
	}
	printf("%d",ans);
}
