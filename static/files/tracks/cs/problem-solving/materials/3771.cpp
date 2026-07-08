/*
题意是按xy坐标均递增的顺序取点，使得点权和最大
先把x坐标排序，然后按顺序取点就可以保证x坐标递增
然后是考虑y坐标大小的关系
设f[i]表示排序完取到前i个点，且第i个点被取到的最大价值
假设当前取了第i个点,那么上一个取的第j个点必须满足j<i,y[j]<y[i]，方程是f[i]=max(f[j]+v[i])
于是我们把y坐标离散掉，用一个随便什么数据结构维护,a[k]为所有y[j]=k的点的最大f[j]，每次查询1到y[i]的最大值作为f[j]更新就好了
*/ 
#include<cstdio>

#include<cstdlib>

#include<cmath>

#include<cstring>

#include<algorithm>

#include<iostream>

#include<vector>

#include<map>

#include<set>

#include<queue>

#include<string>

#define inf 1000000000

#define maxn 100100

#define maxm 500+100

#define eps 1e-10

#define ll long long

#define pa pair<int,int>

#define for0(i,n) for(int i=0;i<=(n);i++)

#define for1(i,n) for(int i=1;i<=(n);i++)

#define for2(i,x,y) for(int i=(x);i<=(y);i++)

#define for3(i,x,y) for(int i=(x);i>=(y);i--)

#define mod 1000000007

using namespace std;

inline int read()

{

    int x=0,f=1;char ch=getchar();

    while(ch<'0'||ch>'9'){if(ch=='-')f=-1;ch=getchar();}

    while(ch>='0'&&ch<='9'){x=10*x+ch-'0';ch=getchar();}

    return x*f;

}
struct rec{int x,id;}b[maxn];
struct recc{int x,y,w;}a[maxn];
int n,m,k,tot,ans,mx[maxn],s[maxn],f[maxn];
inline bool cmp(rec a,rec b)
{
    return a.x<b.x;
}
inline bool cmp2(recc a,recc b)
{
    return a.x<b.x||(a.x==b.x&&a.y<b.y);
}
inline void change(int x,int y)
{
    for(;x<=tot;x+=x&(-x))s[x]=max(s[x],y);
}
inline int ask(int x)
{
    int tt=0;
    for(;x;x-=x&(-x))tt=max(tt,s[x]);
    return tt;
}

int main()

{

    n=read();m=read();k=read();
    for1(i,k)a[i].x=read(),a[i].y=read(),a[i].w=read();
    a[++k].x=n;a[k].y=m;
    for1(i,k)b[i].x=a[i].x,b[i].id=i;
    sort(b+1,b+k+1,cmp);
    for1(i,k)
    {
        if(i==1||b[i].x!=b[i-1].x)tot++;
        a[b[i].id].x=tot;
    }
    for1(i,k)b[i].x=a[i].y,b[i].id=i;
    sort(b+1,b+k+1,cmp);
    tot=0;
    for1(i,k)
    {
        if(i==1||b[i].x!=b[i-1].x)tot++;
        a[b[i].id].y=tot;
    }
    sort(a+1,a+k+1,cmp2);
    for1(i,k)
    {

        int tmp=ask(a[i].y)+a[i].w;
        if(tmp>mx[a[i].y]){mx[a[i].y]=tmp;change(a[i].y,tmp);}
        ans=max(ans,tmp);
    }
    printf("%d\n",ans);

    return 0;

}
