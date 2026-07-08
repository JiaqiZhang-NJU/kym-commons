//by zmyzxb
#include<cstdio>
#include<cstring>
#include<iostream>
using namespace std;

typedef long long ll;
const int MAXN = 10005;
int N;
bool vis[MAXN];int cnt[MAXN],sum;
int Next[MAXN<<1],Last[MAXN<<1],To[MAXN<<1],m;

void addEdge(int x,int y){
	m++; To[m] = y;
	Next[m] = Last[x]; Last[x] = m;	
}

int f[MAXN][3];

void dp(int x){
	vis[x] = true;
	f[x][0] = 1; f[x][1] = 0; f[x][2] = 0; //0-×Ô¼º 1-¸¸Ç× 2-¶ù×Ó 
	int minn = 999999999,tmp;
	for(int t=Last[x];t;t=Next[t]){
		int y = To[t];
		if(vis[y]) continue;
		dp(y);
		f[x][0] += min(f[y][0],min(f[y][1],f[y][2]));
		tmp = min(f[y][0],f[y][2]);
		f[x][1] += tmp;
		f[x][2] += tmp;
		minn = min(f[y][0] - tmp,minn);
	}
	f[x][2] += minn;
}

int main(){
	scanf("%d",&N);
	for(int i=1,x,y;i<N;i++){
		scanf("%d%d",&x,&y);
		addEdge(x,y); addEdge(y,x);	
	}
	//memset(f,127/3,sizeof(f));
	dp(1);
	cout<<min(f[1][0],f[1][2])<<endl;
	return 0;
}
