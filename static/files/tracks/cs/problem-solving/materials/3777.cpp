/* 
考虑对于每个线段树节点记录如果第一个元素选择比较大的，那么最后一个元素最小是多少；选择比较小的同理。
如果不能选到节点的最后一个元素则值为∞。
信息非常容易维护与合并。
交换操作相当于线段树的单点修改。
这样的话就在O(mlogn)之内解决了。
*/
#include<iostream>
#include<cstdio>
#define N 200010
using namespace std;
int a[N][2];
int l[N<<2],r[N<<2],w0[N<<2],w1[N<<2];
void pup(int x)
{
	int t;
	t=w0[x<<1];
	if(t==-1) w0[x]=-1;
	else
	{
		t=a[r[x<<1]][t];
		if(t<=a[l[x<<1|1]][0]) w0[x]=w0[x<<1|1];
		else if(t<=a[l[x<<1|1]][1]) w0[x]=w1[x<<1|1];
		else w0[x]=-1;
	}
	t=w1[x<<1];
	if(t==-1) w1[x]=-1;
	else
	{
		t=a[r[x<<1]][t];
		if(t<=a[l[x<<1|1]][0]) w1[x]=w0[x<<1|1];
		else if(t<=a[l[x<<1|1]][1]) w1[x]=w1[x<<1|1];
		else w1[x]=-1;
	}
}
void build(int now,int ll,int rr)
{
	l[now]=ll;r[now]=rr;
	if(ll==rr)
	{
		w0[now]=0;
		w1[now]=1;
		return;
	}
	int mid=(ll+rr)>>1;
	build(now<<1,ll,mid);
	build(now<<1|1,mid+1,rr);
	pup(now);
}
void change(int now,int x)
{
	if(l[now]==r[now]) return;
	int mid=(l[now]+r[now])>>1;
	if(x<=mid) change(now<<1,x);
	else change(now<<1|1,x);
	pup(now);
}
int main()
{
	int n,m;
	scanf("%d",&n);
	int i,j,x,y;
	for(i=1;i<=n;i++)
	{
		scanf("%d%d",&a[i][0],&a[i][1]);
		if(a[i][0]>a[i][1]) swap(a[i][0],a[i][1]);
	}
	build(1,1,n);
	scanf("%d",&m);
	while(m--)
	{
		scanf("%d%d",&x,&y);
		swap(a[x][0],a[y][0]);
		swap(a[x][1],a[y][1]);
		change(1,x);change(1,y);
		if(w0[1]!=-1) puts("TAK");
		else puts("NIE");
	}
} 
