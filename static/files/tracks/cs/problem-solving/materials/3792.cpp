#include<bits/stdc++.h>
using namespace std;
const int maxn = 8e4+5;
const int mod = 1e9+7;
int dp[maxn],sum[2][maxn],a[205],tot;
void solve()
{
    memset(dp,0,sizeof(dp));
    memset(sum,0,sizeof(sum));
    tot=0;
    int n;scanf("%d",&n);
    for(int i=1;i<=n;i++)
        scanf("%d",&a[i]),tot+=a[i];
    if(tot%2==1)tot++;
    int M=tot*2;
    dp[tot]=1;
    for(int i=1;i<=n;i++)
    {
        sum[0][0]=dp[0];
        sum[1][0]=0;
        for(int j=1;j<=M;j++)
        {
            sum[0][j]=sum[0][j-1];
            sum[1][j]=sum[1][j-1];
            if(j%2==1)sum[1][j]+=dp[j];
            else sum[0][j]+=dp[j];
            sum[0][j]%=mod;
            sum[1][j]%=mod;
        }
        long long res = 0;
        for(int j=0;j<=a[i];j++)
            res = (res + 1ll*dp[j]*((a[i]-j)/2+1))%mod;
        int o = (a[i]%2)^1;
        for(int j=0;j<=M;j++)
        {
            dp[j]=res;
            res+=sum[o][(j+a[i]+1)];
            res%=mod;
            res-=sum[o][j];
            res%=mod;
            o^=1;
            res-=sum[o][j];
            res%=mod;
            res+=sum[o][max((j-a[i]-1),0)];
            res%=mod;
        }
    }
    dp[tot]=dp[tot]%mod;
    dp[tot]=(dp[tot]+mod)%mod;
    cout<<dp[tot]<<endl;
}
int main()
{
    solve();
    return 0;
}
