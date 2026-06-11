const fs=require('fs');const {PNG}=require('pngjs');
const png=PNG.sync.read(fs.readFileSync(process.argv[2]));
const x0=+process.argv[3],y0=+process.argv[4],x1=+process.argv[5],y1=+process.argv[6];
const W=png.width,seen=new Uint8Array(png.width*png.height);
const op=(x,y)=>png.data[((W*y+x)<<2)+3]>10;
const blobs=[];
for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
 if(!op(x,y)||seen[W*y+x])continue;
 let minx=x,maxx=x,miny=y,maxy=y;const st=[[x,y]];seen[W*y+x]=1;
 while(st.length){const [cx,cy]=st.pop();
  if(cx<minx)minx=cx;if(cx>maxx)maxx=cx;if(cy<miny)miny=cy;if(cy>maxy)maxy=cy;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;
   if(nx>=x0&&ny>=y0&&nx<x1&&ny<y1&&!seen[W*ny+nx]&&op(nx,ny)){seen[W*ny+nx]=1;st.push([nx,ny]);}}}
 blobs.push([minx,miny,maxx-minx+1,maxy-miny+1]);
}
blobs.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
for(const b of blobs)if(b[2]>4&&b[3]>4)console.log(b.join(','));
