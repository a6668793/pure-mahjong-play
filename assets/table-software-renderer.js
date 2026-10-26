/* Canvas2D rasterizer for the SAME Three.js world geometry and camera.
 * A graceful rendering backend for browsers with WebGL disabled. No game state. */
export class SoftwareRenderer {
  constructor(T) {
    this.T=T;this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');
    if(!this.ctx)throw new Error('Canvas2D unavailable');
    this.shadowMap={};this.ratio=1;this.images=new WeakMap();this.isSoftwareRenderer=true;
    this.light=new T.Vector3(-7,18,9).normalize();
  }
  setPixelRatio(r){this.ratio=1;}
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
        const encoded=color.clone().convertLinearToSRGB();const rgb=[Math.min(255,encoded.r*255),Math.min(255,encoded.g*255),Math.min(255,encoded.b*255)];
        triangles.push({a,b,c,z:(a.z+b.z+c.z)/3,fill:rgb,alpha:mat.opacity??1,image:mat.map?.image,repeat:mat.map?.repeat,shade});
      }
    });
    // Per-pixel depth resolves intersecting tabletop, bevels and stacked wall tiles.
    // Perspective-correct UVs keep every tile symbol intact across both face triangles.
    const output=ctx.createImageData(w,h),pixels=output.data,depth=new Float32Array(w*h);depth.fill(Infinity);
    for(const t of triangles){
      const {a,b,c}=t,det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<.001)continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      let tex=null;
      if(t.image){tex=this.images.get(t.image);if(!tex){tex=t.image.getContext('2d').getImageData(0,0,t.image.width,t.image.height);this.images.set(t.image,tex);}}
      const za=-1/a.z,zb=-1/b.z,zc=-1/c.z;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const p=( (b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y) )/det;
        const q=( (c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y) )/det,r=1-p-q;
        if(p<-.0001||q<-.0001||r<-.0001)continue;
        const inv=p*za+q*zb+r*zc,z=1/inv,k=y*w+x;if(z>=depth[k])continue;
        const dest=k*4;let red=t.fill[0],green=t.fill[1],blue=t.fill[2];
        if(tex){
          let u=(p*a.u*za+q*b.u*zb+r*c.u*zc)/inv,v=(p*a.v*za+q*b.v*zb+r*c.v*zc)/inv;
          if(t.repeat&&(t.repeat.x>1||t.repeat.y>1)){u=((u*t.repeat.x)%1+1)%1;v=((v*t.repeat.y)%1+1)%1;}
          const tx=Math.min(tex.width-1,Math.max(0,Math.floor(u*tex.width))),ty=Math.min(tex.height-1,Math.max(0,Math.floor((1-v)*tex.height))),src=(ty*tex.width+tx)*4;
          red=tex.data[src]*t.shade;green=tex.data[src+1]*t.shade;blue=tex.data[src+2]*t.shade;
        }
        depth[k]=z;pixels[dest]=red;pixels[dest+1]=green;pixels[dest+2]=blue;pixels[dest+3]=255;
      }
    }
    ctx.putImageData(output,0,0);
    // Textures can be updated asynchronously by the presentation adapter.
    this.images=new WeakMap();
  }
  dispose(){this.domElement.width=this.domElement.height=1;}
  forceContextLoss(){}
}
