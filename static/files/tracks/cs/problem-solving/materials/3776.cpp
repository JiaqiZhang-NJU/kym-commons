/*
 显然，如果存在>=s的数有k个，那么我们一定每次都要选这k个，如果k>=c就不用管了肯定TAK。

       否则，考虑<s的数的数字和，如果数字和>=(c-k)*s，那么剩下的数就可以将剩余的空填完；否则不能。

       考虑证明。数字和<(c-k)*s肯定不能，因为根本不够取；否则数的个数显然>=(c-k)*s/(s-1)>c-k，也就是每一次都一定能找出c-k个数。每次都从大的取，那么取完以后还满足。

       于是可以用树状数组在离散化以后维护<=t的数的和，<=t的数的个数。
*/ 
#include<iostream>
#include<cstdio>
#include<algorithm>
#define ll long long
#define N 1000005
using namespace std;

int n,m,cnt,a[N],x[N],y[N],z[N],num[N],hash[N];
struct bit_node{
	ll c[N];
	void add(int x,int t){
		for (; x<=cnt; x+=x&-x) c[x]+=t;
	}
	ll qry(int x){
		ll t=0; for (; x; x-=x&-x) t+=c[x]; return t;
	}
}bit1,bit2;
int read(){
	int x=0; char ch=getchar();
	while (ch<'0' || ch>'9') ch=getchar();
	while (ch>='0' && ch<='9'){ x=x*10+ch-'0'; ch=getchar(); }
	return x;
}
int find(int x){
	int l=1,r=cnt,mid;
	while (l<r){
		mid=(l+r)>>1;
		if (hash[mid]<x) l=mid+1; else r=mid;
	}
	return l;
}
int main(){
	n=read(); m=read(); int i,j; char ch;
	for (i=1; i<=m; i++){
		ch=getchar(); while (ch<'A' || ch>'Z') ch=getchar();
		x[i]=read(); y[i]=num[i]=read();
		z[i]=(ch=='U')?1:0;
	}
	sort(num+1,num+m+1); hash[cnt=1]=num[1];
	for (i=2; i<=m; i++)
		if (num[i]!=num[i-1]) hash[++cnt]=num[i];
	for (i=1; i<=m; i++) y[i]=find(y[i]);
	for (i=1; i<=m; i++) if (z[i]){
		if (j=a[x[i]]){
			bit1.add(j,-1); bit2.add(j,-hash[j]);
		}
		a[x[i]]=y[i];
		bit1.add(y[i],1); bit2.add(y[i],hash[y[i]]);
	} else puts(bit2.qry(y[i]-1)>=(x[i]-bit1.qry(cnt)+bit1.qry(y[i]-1))*hash[y[i]]?"TAK":"NIE");
	return 0;
}

