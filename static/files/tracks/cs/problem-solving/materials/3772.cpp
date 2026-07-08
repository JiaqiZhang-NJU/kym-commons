/*
线段树经典题

nxt[i]记录第i天的电影下次播放时间

枚举区间左端点，线段树维护每个位置作为右端点的答案

考虑l-r的左端点变为l+1

发现l到nxt[l]-1的答案减少w[f[l]]

而nxt[l]到nxt[nxt[l]]-1增加w[f[l]]

线段树维护，支持区间修改以及查询最大值
*/ 
#include<cstdio>
#include<cmath>
#include<cstring>
#include<iostream>
#define ll long long
using namespace std;
int read()
{
    int x=0;char ch=getchar();
    while(ch>'9'||ch<'0')ch=getchar();
    while(ch>='0'&&ch<='9'){x=x*10+ch-'0';ch=getchar();}
    return x;
}
int n,m;
int f[1000005],w[1000005];
int last[1000005],nxt[1000005];
ll ans;
struct seg{
	int l,r;
	ll tag,mx;
}t[4000005];
void pushdown(int k)
{
	int l=t[k].l,r=t[k].r;
	if(l==r)return;
	ll tag=t[k].tag;t[k].tag=0;
	t[k<<1].tag+=tag;t[k<<1|1].tag+=tag;
	t[k<<1].mx+=tag;t[k<<1|1].mx+=tag;
}
void build(int k,int l,int r)
{
	t[k].l=l;t[k].r=r;
	if(l==r)return;
	int mid=(l+r)>>1;
	build(k<<1,l,mid);build(k<<1|1,mid+1,r);
}
void add(int k,int x,int y,int val)
{
	if(t[k].tag)pushdown(k);
	int l=t[k].l,r=t[k].r,mid=(l+r)>>1;
	if(l==x&&y==r)
	{
		t[k].tag=val;t[k].mx+=val;
		return;
	}
	if(y<=mid)add(k<<1,x,y,val);
	else if(x>mid)add(k<<1|1,x,y,val);
	else add(k<<1,x,mid,val),add(k<<1|1,mid+1,y,val);
	t[k].mx=max(t[k<<1].mx,t[k<<1|1].mx);
}
int main()
 {
	 n=read();m=read();
	 for(int i=1;i<=n;i++)f[i]=read();
	 for(int i=1;i<=m;i++)w[i]=read();
	 for(int i=n;i;i--)
	 {
		 nxt[i]=last[f[i]];
		 last[f[i]]=i;
	 }
	 build(1,1,n);
	 for(int i=1;i<=m;i++)
		 if(last[i])
		 {
			 if(!nxt[last[i]])add(1,last[i],n,w[i]);
			 else add(1,last[i],nxt[last[i]]-1,w[i]);
		 }
	 for(int i=1;i<=n;i++)
	 {
		 ans=max(ans,t[1].mx);
		 int t=nxt[i];
		 if(t)
		 {
			 add(1,i,t-1,-w[f[i]]);
			 if(nxt[t])add(1,t,nxt[t]-1,w[f[i]]);
			 else add(1,t,n,w[f[i]]);
		 }
		 else add(1,i,n,-w[f[i]]);
	 }
	 printf("%I64d\n",ans);
	 return 0;
}
