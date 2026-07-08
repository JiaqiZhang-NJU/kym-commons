//by supergate
#include<cstdio>
#include<iostream>
using namespace std;
const int maxn=55,maxt=2505;
int n,m,t,f[maxn][maxt],g[maxn][maxt];
int sum[maxn];
string ch;
int main(){
	cin>>n>>m>>t;
	int i,j,k,p,ans=0;
	for(k=1;k<=n;k++){
		cin>>ch;
		for(i=0;i<m;i++)sum[i+1]=sum[i]+(ch[i]=='1');
		for(i=1;i<=m;i++)
	        for(j=1;j<=m;j++){
	    	    g[j][i]=0;
	    	    for(p=0;p<j;p++){
	    		    int cur=sum[j]-sum[p];
	    		    g[j][i]=max(g[j][i],g[p][i-1]+max(cur,j-cur-p));
	    	    }
	        }
	    for(i=1;i<=t;i++){
		    int cur=min(m,i);
		    for(j=1;j<=cur;j++)
	    	    f[k][i]=max(f[k][i],f[k-1][i-j]+g[m][j]);
	    }
	}
	for(i=0;i<=t;i++)ans=max(ans,f[n][i]);
	cout<<ans;  
}
