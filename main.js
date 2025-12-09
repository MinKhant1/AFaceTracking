  import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loadTexture = (path) => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, (texture) => {
      resolve(texture);
    }, undefined, (err) => {
      reject(err);
    });
  });
}

class DinoGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.playerEl = document.getElementById('player');
    this.scoreEl = document.getElementById('score');
    this.gameOverEl = document.getElementById('game-over');
    this.finalScoreEl = document.getElementById('final-score');
    this.retryBtn = document.getElementById('retry-btn');
    
    this.obstacles = [];
    this.score = 0;
    this.gameOver = false;
    this.gravity = 0.5;
    this.jumpForce = 10;
    this.velocityY = 0;
    this.isJumping = false;
    this.micVolume = 0;
    
    // Player state (pixels)
    this.playerY = 0;
    
    this.setupAudio();
    
    this.retryBtn.addEventListener('click', () => {
      this.resetGame();
    });
  }
  
  resetGame() {
    this.gameOver = false;
    this.score = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.playerY = 0;
    this.playerEl.style.bottom = '0px';
    
    // Remove all obstacles
    this.obstacles.forEach(obs => obs.element.remove());
    this.obstacles = [];
    
    this.gameOverEl.style.display = 'none';
  }
  
  async setupAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);
      
      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        for (let i = 0; i < array.length; i++) values += array[i];
        this.micVolume = values / array.length;
      };
    } catch(e) {
      console.error('Mic access denied', e);
    }
  }
  
  update() {
    if (this.gameOver) return;
    
    // Score
    this.score++;
    if (this.scoreEl) this.scoreEl.innerText = Math.floor(this.score / 10);
    
    // Jump (Shout) - Threshold 20
    if (this.micVolume > 20 && !this.isJumping) {
      this.velocityY = this.jumpForce;
      this.isJumping = true;
    }
    
    // Physics
    this.playerY += this.velocityY;
    if (this.playerY > 0) {
      this.velocityY -= this.gravity;
    } else {
      this.playerY = 0;
      this.velocityY = 0;
      this.isJumping = false;
    }
    this.playerEl.style.bottom = `${this.playerY}px`;
    
    // Obstacles
    if (this.score % 100 === 0) { // Spawn rate
        this.spawnObstacle();
    }
    
    // Move Obstacles & Collision
    const playerRect = this.playerEl.getBoundingClientRect();
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= 3; // Speed (pixels)
        obs.element.style.left = `${obs.x}px`;
        
        // Collision Detection (2D AABB)
        const obsRect = obs.element.getBoundingClientRect();
        
        if (
          playerRect.left < obsRect.right &&
          playerRect.right > obsRect.left &&
          playerRect.top < obsRect.bottom &&
          playerRect.bottom > obsRect.top
        ) {
          this.endGame();
        }
        
        // Cleanup
        if (obs.x < -30) {
            obs.element.remove();
            this.obstacles.splice(i, 1);
        }
    }
  }
  
  spawnObstacle() {
      const obstacleEl = document.createElement('div');
      obstacleEl.className = 'obstacle';
      obstacleEl.style.left = '300px'; // Start off-screen right
      this.container.appendChild(obstacleEl);
      
      this.obstacles.push({
        element: obstacleEl,
        x: 300
      });
  }
  
  endGame() {
      this.gameOver = true;
      if (this.gameOverEl) {
        this.gameOverEl.style.display = 'block';
        this.finalScoreEl.innerText = Math.floor(this.score / 10);
      }
  }
}

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

        const logoTexture = await loadTexture('/assets/2D/logo.png');
        const logoMaterial = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });
        const logoGeometry = new THREE.PlaneGeometry(1, 1);
        const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
        logoMesh.scale.set(0.3, 0.3, 0.3);
        logoMesh.position.z = 0.05;

        const cheekAnchor = mindarThree.addAnchor(411);
        cheekAnchor.group.add(logoMesh);

        const game = new DinoGame();

        await mindarThree.start();
        renderer.setAnimationLoop(() => { 
          renderer.render(scene, camera);
          game.update();
        });
    };

    start();
  });