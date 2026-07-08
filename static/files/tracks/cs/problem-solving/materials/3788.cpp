//by spark
#include<cstdio> 
#include<iostream> 
#include<cstdlib> 
#include<cmath> 
#include<cstring> 
#include<queue> 
#include<vector> 
#include<algorithm> 

#define INTpair pair<int,int>
#define xx fisrt
#define yy second
#define LL long long 
#define CLEAR(xxx) memset(xxx,0,sizeof(xxx)) 

using namespace std; 
const int maxn=500000+5; 

int n,m;
int Last[maxn],Next[maxn<<1],To[maxn<<1];
LL ans=0,f[maxn],dist[maxn],size[maxn];

inline void _read(int &x){ 
    char ch=getchar(); bool mark=false; 
    for(;!isdigit(ch);ch=getchar())if(ch=='-')mark=true; 
    for(x=0;isdigit(ch);ch=getchar())x=x*10+ch-'0'; 
    if(mark)x=-x; 
} 

void Addedge(int from,int to){
	To[++m]=to;
	Next[m]=Last[from];
	Last[from]=m;
}

void DFS(int x,int fa){
	size[x]=1;
	for(int i=Last[x];i;i=Next[i]){
		if(To[i]==fa) continue;
		DFS(To[i],x);
		dist[x]+=dist[To[i]]+size[To[i]];
		size[x]+=size[To[i]];
	}
}

void DP(int x,int fa){
	if(x==1)f[x]=dist[x];
	else f[x]=f[fa]+n-2*size[x];
	if(f[ans]<f[x]||(f[x]==f[ans]&&x<ans))ans=x;
	for(int i=Last[x];i;i=Next[i]){
		if(To[i]==fa)continue;
		DP(To[i],x);
	}
}

int main_main(){
	int i,j,u,v;
	_read(n);
	for(i=1;i<n;i++){
		_read(u);_read(v);
		Addedge(u,v);
		Addedge(v,u);
	}
	DFS(1,0);
	DP(1,1);
	cout<<ans<<endl;
	//for(i=1;i<=n;i++)cout<<f[i]<<endl;
	return 0;
}
const int main_stack=16;
char my_stack[128<<20];  
int main(){
  __asm__("movl %%esp, (%%eax);\n"::"a"(my_stack):"memory");  
  __asm__("movl %%eax, %%esp;\n"::"a"(my_stack+sizeof(my_stack)-main_stack):"%esp");  
  main_main();  
  __asm__("movl (%%eax), %%esp;\n"::"a"(my_stack):"%esp");  
  return 0;  
} 
