  import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loadGlTF = (path) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
      resolve(gltf);
    }, undefined, (err) => {
      reject(err);
    });
  });
}
  document.addEventListener('DOMContentLoaded', () => {

    const start = async() => {
        const mindarThree = new MindARThree({ container: document.body });
        const { renderer, scene, camera } = mindarThree;
        
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.add(light);

        const occuluder=await loadGlTF('/assets/models/sparkar-occluder/headOccluder.glb');
     const occluderMaterial=new THREE.MeshBasicMaterial({colorWrite:false});
        occuluder.scene.traverse((child) => {
          if (child.isMesh) {
            child.material = occluderMaterial;
          }
        });

        const occlAnchor=mindarThree.addAnchor(168);
        occuluder.scene.scale.set(0.065, 0.065, 0.065);
        occuluder.scene.position.set(0, -0.3, 0.15);
        occuluder.scene.renderOrder=0;
        occlAnchor.group.add(occuluder.scene);
        
        const glasses=await loadGlTF('/assets/models/glasses1/scene.gltf');
        glasses.scene.scale.set(0.007, 0.007, 0.007);
        glasses.scene.renderOrder=1;  

         const anchor = mindarThree.addAnchor(168);
         anchor.group.add(glasses.scene);


        await mindarThree.start();
        renderer.setAnimationLoop(() => { renderer.render(scene, camera);});
    };

    start();
  });