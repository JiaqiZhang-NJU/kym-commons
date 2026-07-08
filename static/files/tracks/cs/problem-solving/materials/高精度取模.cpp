/*
算法思想：利用(a+b)%c=a%c+b%c。
算法复杂度：o(n)
*/
#include<iostream>
#include<algorithm>
using namespace std;
int mod(string a,int b)//高精度a除以单精度b
{
    int d=0;
    for(int i=0;i<a.size();i++) d=(d*10+(a[i]-'0'))%b;//求出余数
    return d;
}
int main()
{
    string a;
    int b;
    while(cin>>a>>b)
    {
        cout<<mod(a,b)<<endl;
    }
    return 0;
}
