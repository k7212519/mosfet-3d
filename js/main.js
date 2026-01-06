import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ParticleSystem } from './particles.js';
import { createPlanarCMOS, createSOICMOS, createFinFET, createGAAFET } from './models.js';

// State
let scene, camera, renderer, controls;
let currentModelGroup = null;
let animationId;
const particleSystem = new ParticleSystem();

function setupLights() {
    RectAreaLightUniformsLib.init();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 40);
    spotLight.position.set(5, 10, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    const rectLight1 = new THREE.RectAreaLight(0x4488ff, 12, 10, 10);
    rectLight1.position.set(-5, 5, 5);
    rectLight1.lookAt(0, 0, 0);
    scene.add(rectLight1);

    const rectLight2 = new THREE.RectAreaLight(0xff8844, 12, 10, 10);
    rectLight2.position.set(5, 5, -5);
    rectLight2.lookAt(0, 0, 0);
    scene.add(rectLight2);

    const bottomLight = new THREE.DirectionalLight(0xaabbff, 3);
    bottomLight.position.set(0, -5, 0);
    bottomLight.target.position.set(0, 0, 0);
    scene.add(bottomLight);
    scene.add(bottomLight.target);
}

function clearScene() {
    if (currentModelGroup) {
        scene.remove(currentModelGroup);
        currentModelGroup.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
            }
        });
        currentModelGroup = null;
    }
    renderer.renderLists.dispose();
}

function updateUI(type) {
    const titleMap = {
        'planar': 'Planar MOSFET<br><span class="model-subtitle">(平面场效应晶体管)</span>',
        'soi': 'SOI MOSFET<br><span class="model-subtitle">(绝缘体上硅场效应管)</span>',
        'finfet': 'FinFET<br><span class="model-subtitle">(鳍式场效应晶体管)</span>',
        'gaafet': 'GAAFET<br><span class="model-subtitle">(全环绕栅极场效应管)</span>'
    };
    const descMap = {
        'planar': '传统的平面结构，电流在硅片表面的二维平面中流动。随着尺寸缩小，漏电流难以控制。',
        'soi': '在硅衬底和活性层之间增加了一层氧化埋层(BOX)，减少寄生电容和漏电流，适合低功耗应用。',
        'finfet': '将通道竖立起来形成"鳍(Fin)"，栅极三面包裹通道，极大增强了对电流的控制能力，是22nm-5nm节点的主流技术。',
        'gaafet': '栅极四面完全包裹通道（通常为纳米线或纳米片），提供极致的电流控制能力，是3nm及以下节点的关键技术。'
    };

    document.getElementById('model-title').innerHTML = titleMap[type];
    document.getElementById('model-desc').innerText = descMap[type];

    document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
}

window.switchModel = function(type) {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(b => {
        if(b.getAttribute('onclick').includes(type)) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    clearScene();
    updateUI(type);

    if(type === 'planar') currentModelGroup = createPlanarCMOS(scene, particleSystem);
    if(type === 'soi') currentModelGroup = createSOICMOS(scene, particleSystem);
    if(type === 'finfet') currentModelGroup = createFinFET(scene, particleSystem);
    if(type === 'gaafet') currentModelGroup = createGAAFET(scene, particleSystem);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    
    if(currentModelGroup) {
        currentModelGroup.rotation.y += 0.002;
    }
    
    particleSystem.update();
    renderer.render(scene, camera);
}

function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 4, 8);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);

    // Lights
    setupLights();

    // Initial Model based on URL param
    const urlParams = new URLSearchParams(window.location.search);
    const modelIndex = urlParams.get('type');
    
    if (modelIndex === '2') {
        currentModelGroup = createSOICMOS(scene, particleSystem);
        updateUI('soi');
        // Update button state
        document.querySelectorAll('.btn').forEach((b, i) => {
            b.classList.toggle('active', i === 1);
        });
    } else if (modelIndex === '3') {
        currentModelGroup = createFinFET(scene, particleSystem);
        updateUI('finfet');
        document.querySelectorAll('.btn').forEach((b, i) => {
            b.classList.toggle('active', i === 2);
        });
    } else if (modelIndex === '4') {
        currentModelGroup = createGAAFET(scene, particleSystem);
        updateUI('gaafet');
        document.querySelectorAll('.btn').forEach((b, i) => {
            b.classList.toggle('active', i === 3);
        });
    } else {
        currentModelGroup = createPlanarCMOS(scene, particleSystem);
        updateUI('planar');
    }

    // Resize listener
    window.addEventListener('resize', onWindowResize);

    // Animation Loop
    animate();
}

// Start
init();

