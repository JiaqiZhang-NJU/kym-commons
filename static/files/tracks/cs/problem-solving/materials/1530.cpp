//by zmyzxb
#include<iostream>
#include<cstdio>
#include<cstring>
using namespace std;

typedef long long ll;
int N,K;int _abs(int x){return x>0?x:-x;}
int a[20];ll f[17][1<<17];

int main(){
	scanf("%d%d",&N,&K);
	for(int i=0;i<N;i++) scanf("%d",&a[i]);
	
	int lim = (1<<N)-1;
	for(int i=0;i<N;i++) f[i][(1<<i)] = 1LL;
	for(int S=1;S<=lim;S++){
		for(int i=0;i<N;i++){
			for(int j=0;j<N;j++){
				if(i!=j&&(S>>i&1)&&((S>>j&1))&&_abs(a[i]-a[j])>K){
					f[i][S] += f[j][S^(1<<i)]; 
				}
			}
		}
	}
	ll ans = 0;
	for(int i=0;i<N;i++) ans += f[i][lim];
	cout<<ans<<endl;
}
