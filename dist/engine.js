(function(root){
'use strict';
function choose(n,k){if(k<0||k>n)return 0n;let r=1n;for(let i=1;i<=k;i++)r=r*BigInt(n-i+1)/BigInt(i);return r;}
function randomInt(max){const limit=4294967296-(4294967296%max);const a=new Uint32Array(1);do{globalThis.crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%max;}
function multiplier(m,k){if(k===0)return 1;return Number(99n*choose(25,k))/Number(100n*choose(25-m,k));}
function payout(bet,m,k){if(k===0)return 0;return Number(BigInt(bet)*99n*choose(25,k)/(100n*choose(25-m,k)));}
class MinesGame{
 constructor(random=randomInt){this.random=random;this.balance=100000;this.status='ready';this.bet=10000;this.mines=3;this.hits=new Set();this.hazards=new Set();this.lastPayout=0;this.triggered=null;}
 start(bet,mines){if(this.status==='playing')throw Error('진행 중인 라운드를 먼저 마쳐주세요.');if(!Number.isSafeInteger(bet)||bet<100||bet>100000)throw Error('베팅은 1~1,000 CR로 입력하세요.');if(bet>this.balance)throw Error('크레딧이 부족합니다. 베팅을 줄이거나 초기화하세요.');if(!Number.isInteger(mines)||mines<1||mines>24)throw Error('위험 코스는 1~24개로 설정하세요.');const cells=Array.from({length:25},(_,i)=>i);for(let i=24;i>0;i--){const j=this.random(i+1);if(!Number.isInteger(j)||j<0||j>i)throw Error('난수 오류');[cells[i],cells[j]]=[cells[j],cells[i]]}this.hazards=new Set(cells.slice(0,mines));this.hits=new Set();this.balance-=bet;this.bet=bet;this.mines=mines;this.lastPayout=0;this.triggered=null;this.status='playing';return this.snapshot();}
 reveal(index){if(this.status!=='playing')throw Error('먼저 타석에 들어서세요.');if(!Number.isInteger(index)||index<0||index>=25)throw Error('유효한 코스를 선택하세요.');if(this.hits.has(index))throw Error('이미 타격한 코스입니다.');if(this.hazards.has(index)){this.status='out';this.triggered=index;return 'out';}this.hits.add(index);if(this.hits.size===25-this.mines){this.cashout();this.status='cleared';return 'cleared';}return 'hit';}
 cashout(){if(this.status!=='playing'||this.hits.size===0)throw Error('1회 이상 성공해야 상금을 확정할 수 있습니다.');this.lastPayout=payout(this.bet,this.mines,this.hits.size);this.balance+=this.lastPayout;this.status='cashed';return this.lastPayout;}
 reset(){if(this.status==='playing')throw Error('라운드 중에는 초기화할 수 없습니다.');this.balance=100000;this.status='ready';this.hits.clear();this.hazards.clear();this.lastPayout=0;this.triggered=null;return this.snapshot();}
 snapshot(){const k=this.hits.size,active=this.status==='playing';return {status:this.status,balance:this.balance,bet:this.bet,mines:this.mines,hits:[...this.hits],multiplier:multiplier(this.mines,k),nextMultiplier:k<25-this.mines?multiplier(this.mines,k+1):null,cashout:active?payout(this.bet,this.mines,k):this.lastPayout,successProbability:(25-this.mines-k)/(25-k),remainingSafe:25-this.mines-k};}
}
const api={MinesGame,choose,multiplier,payout,randomInt};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MinesEngine=api;
})(globalThis);
