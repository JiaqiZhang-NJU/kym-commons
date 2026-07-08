/*
如果区间[j, i]固定，那么一定是将权值最大的一段变为0。
用单调队列维护一段区间内权值最大的子段下标（这里记录右端点下标，设为x），枚举右端点i，用尺取法计算出j。
一段区间[j, i]合法的条件是sum[i] - sum[j - 1] - (sum[x] - sum[x - d]) <= p。

 首先令s[i]表示(1,i)序列的和。现在考虑一段序列(i,j)，如何判断这段序列是否满足条件呢？当j-i+1<=d时显然满足；否则，我们肯定是要让这一段序列中总和最大的一段(x,x+d)变为0，换句话说，如果设x，使x满足i<=x,x+d<=j且s[x+d]-s[x]值最大，那么如果s[i]-s[j-1]-(s[x+d]-s[x])<=p，那么(i,j)满足条件。

       因此我们枚举右端点j，显然i随着j的增大而增大，x也随之增大。因此我们用单调队列维护此时(i,j)的x，然后如果s[i]-s[j-1]-(s[x+d]-s[x])>p就不断i++，第一个满足条件的i就是当右端点为j时左端点的最大延伸长度。
*/ 
#include<stdio.h>
#include<iostream>
using namespace std;
#define ll long long
const int N=2e6+5;
int d,n,i,j,x,t,w,ans,g[N];
ll p,sum[N],f[N];
inline void read(int &v){
    char ch,fu=0;
    for(ch='*'; (ch<'0'||ch>'9')&&ch!='-'; ch=getchar());
    if(ch=='-') fu=1, ch=getchar();
    for(v=0; ch>='0'&&ch<='9'; ch=getchar()) v=v*10+ch-'0';
    if(fu) v=-v;
}
int main()
{
    cin>>n>>p>>d;
    for(i=1;i<=n;i++)
        read(x),sum[i]=sum[i-1]+x;
    for(i=1;i<=n-d+1;i++)
        f[i]=sum[i+d-1]-sum[i-1];
    t=w=j=1;
    for(i=d;i<=n;i++)
    {
        while(t<=w&&f[i-d+1]>=f[g[w]]) w--;
        g[++w]=i-d+1;
        while(t<w&&g[t]<j) t++;
        while(sum[i]-sum[j-1]-f[g[t]]>p)
        {
            j++;
            while(t<w&&g[t]<j) t++;
        }
        if(g[t]>=j) ans=max(ans,i-j+1);
    }
    cout<<ans;
    return 0;
}
