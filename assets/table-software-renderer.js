/* Canvas2D rasterizer for the SAME Three.js world geometry and camera.
 * A graceful rendering backend for browsers with WebGL disabled. No game state. */
export class SoftwareRenderer {
  constructor(T) {
    this.T=T;this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');
    if(!this.ctx)throw new Error('Canvas2D unavailable');
    this.shadowMap={};this.ratio=1;this.isSoftwareRenderer=true;
    this.light=new T.Vector3(-7,18,9).normalize();
  }
  setPixelRatio(r){this.ratio=Math.min(r,1.25);}
  setSize(w,h){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);}
  render(scene,camera){
    const T=this.T,ctx=this.ctx,w=this.width,h=this.height,triangles=[];
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const eye=new T.Vector3().setFromMatrixPosition(camera.matrixWorld),light=this.light;
    scene.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible)return;
      const geo=mesh.geometry,pos=geo.attributes.position,uv=geo.attributes.uv,index=geo.index;
      if(!pos)return;
      const verts=[];for(let i=0;i<pos.count;i++){
        const p=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld),q=p.clone().project(camera);
        verts.push({world:p,x:(q.x+1)*w/2,y:(1-q.y)*h/2,z:p.clone().applyMatrix4(camera.matrixWorldInverse).z,u:uv?.getX(i),v:uv?.getY(i)});
      }
      const count=index?index.count:pos.count;
      for(let i=0;i<count;i+=3){
        const a=verts[index?index.getX(i):i],b=verts[index?index.getX(i+1):i+1],c=verts[index?index.getX(i+2):i+2];
        const normal=new T.Vector3().subVectors(b.world,a.world).cross(new T.Vector3().subVectors(c.world,a.world)).normalize();
        if(normal.dot(new T.Vector3().subVectors(eye,a.world))<=0)continue;
        if(Math.max(a.x,b.x,c.x)<0||Math.min(a.x,b.x,c.x)>w||Math.max(a.y,b.y,c.y)<0||Math.min(a.y,b.y,c.y)>h)continue;
        let mat=mesh.material;if(Array.isArray(mat)){const group=geo.groups.find(g=>i>=g.start&&i<g.start+g.count);mat=mat[group?.materialIndex??0];}
        const shade=.67+Math.max(0,normal.dot(light))*.38;
        let color=mat.color.clone();
        // Model surfaces have procedural pixel textures in WebGL. Use their base tones here.
        if(mat.map&&geo.type==='BoxGeometry'){
          const image=mat.map.image;
          color=new T.Color(image?.width===128?(mat.map.repeat.x===7?'#166047':'#593923'):'#f3e5c7');
        }
        color.multiplyScalar(shade);
        const rgb='#'+color.getHexString(T.SRGBColorSpace);
        triangles.push({a,b,c,z:(a.z+b.z+c.z)/3,fill:rgb,alpha:mat.opacity??1,image:geo.type==='PlaneGeometry'?mat.map?.image:null});
      }
    });
    triangles.sort((a,b)=>a.z-b.z);
    ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    for(const t of triangles){
      const {a,b,c}=t;ctx.globalAlpha=t.alpha;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fillStyle=t.fill;ctx.fill();ctx.strokeStyle=t.fill;ctx.lineWidth=.45;ctx.stroke();
      if(t.image){
        const iw=t.image.width,ih=t.image.height;
        const u0=a.u*iw,v0=(1-a.v)*ih,u1=b.u*iw,v1=(1-b.v)*ih,u2=c.u*iw,v2=(1-c.v)*ih;
        const det=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(det)<1e-7)continue;
        const A=(a.x*(v1-v2)+b.x*(v2-v0)+c.x*(v0-v1))/det;
        const C=(a.x*(u2-u1)+b.x*(u0-u2)+c.x*(u1-u0))/det;
        const E=(a.x*(u1*v2-u2*v1)+b.x*(u2*v0-u0*v2)+c.x*(u0*v1-u1*v0))/det;
        const B=(a.y*(v1-v2)+b.y*(v2-v0)+c.y*(v0-v1))/det;
        const D=(a.y*(u2-u1)+b.y*(u0-u2)+c.y*(u1-u0))/det;
        const F=(a.y*(u1*v2-u2*v1)+b.y*(u2*v0-u0*v2)+c.y*(u0*v1-u1*v0))/det;
        ctx.save();ctx.clip();ctx.transform(A,B,C,D,E,F);ctx.drawImage(t.image,0,0);ctx.restore();
      }
    }
    ctx.globalAlpha=1;
  }
  dispose(){this.domElement.width=this.domElement.height=1;}
  forceContextLoss(){}
}
