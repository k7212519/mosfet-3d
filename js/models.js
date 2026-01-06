import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';

const EPS = 0.002; // Small offset to prevent Z-fighting

// 1. Planar MOSFET (Ordinary)
export function createPlanarCMOS(scene, particleSystem) {
    const group = new THREE.Group();

    // Substrate - Single Mesh using ExtrudeGeometry
    const shape = new THREE.Shape();
    const r = 0.1; // Corner radius (slightly smaller than S/D for clearance)
    const wStart = -2.25;
    const wEnd = 2.25;
    const yBottom = -1.3;
    const yTop = 0.2; // Raised Side Walls
    const channelThickness = 0.1;
    const channelTopY = yTop - channelThickness;
    const yCenterTop = channelTopY - 0.03; // Lower Center
    const yWellBottom = -0.3;

    // Start bottom left (after corner)
    shape.moveTo(wStart + r, yBottom);
    
    // Bottom edge and Bottom-Right corner
    shape.lineTo(wEnd - r, yBottom);
    shape.quadraticCurveTo(wEnd, yBottom, wEnd, yBottom + r);
    
    // Right outer edge and Top-Right outer corner
    shape.lineTo(wEnd, yTop - r);
    shape.quadraticCurveTo(wEnd, yTop, wEnd - r, yTop);
    
    // Top of Right Wall and Inner corner (down into well)
    // Wall ends at 1.75
    shape.lineTo(1.75 + r, yTop);
    shape.quadraticCurveTo(1.75, yTop, 1.75, yTop - r);
    
    // Right Well side (down) and Bottom-Right corner
    shape.lineTo(1.75, yWellBottom + r);
    shape.quadraticCurveTo(1.75, yWellBottom, 1.75 - r, yWellBottom);
    
    // Well Bottom and Bottom-Left corner
    shape.lineTo(0.5 + r, yWellBottom);
    shape.quadraticCurveTo(0.5, yWellBottom, 0.5, yWellBottom + r);
    
    // Center Wall right side (up) and Top-Right corner
    shape.lineTo(0.5, yCenterTop - r);
    shape.quadraticCurveTo(0.5, yCenterTop, 0.5 - r, yCenterTop);
    
    // Top of Center Wall and Top-Left corner
    shape.lineTo(-0.5 + r, yCenterTop);
    shape.quadraticCurveTo(-0.5, yCenterTop, -0.5, yCenterTop - r);
    
    // Center Wall left side (down) and Bottom-Right corner (of left well)
    shape.lineTo(-0.5, yWellBottom + r);
    shape.quadraticCurveTo(-0.5, yWellBottom, -0.5 - r, yWellBottom);
    
    // Left Well Bottom and Bottom-Left corner
    shape.lineTo(-1.75 + r, yWellBottom);
    shape.quadraticCurveTo(-1.75, yWellBottom, -1.75, yWellBottom + r);
    
    // Left Wall inner side (up) and Top-Right corner (of left wall)
    shape.lineTo(-1.75, yTop - r);
    shape.quadraticCurveTo(-1.75, yTop, -1.75 - r, yTop);
    
    // Top of Left Wall and Top-Left outer corner
    shape.lineTo(wStart + r, yTop);
    shape.quadraticCurveTo(wStart, yTop, wStart, yTop - r);
    
    // Left outer edge and Bottom-Left corner
    shape.lineTo(wStart, yBottom + r);
    shape.quadraticCurveTo(wStart, yBottom, wStart + r, yBottom);

    const extrudeSettings = {
        steps: 1,
        depth: 3.0,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
    };

    const substrateGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the geometry in Z (since extrusion is 0 to depth)
    substrateGeo.translate(0, 0, -1.5);

    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.receiveShadow = true;
    group.add(substrate);

    // Source (Left Well) - Embedded
    // Slightly thicker (3.02) to avoid Z-fighting with substrate (3.0)
    // Position y: center of -0.3 to 0.2 is -0.05. Height is 0.5.
    const sourceGeo = new RoundedBoxGeometry(1.20, 0.5, 3.02, 4, 0.05);
    const source = new THREE.Mesh(sourceGeo, materials.siliconActive);
    source.material = materials.siliconActive.clone();
    source.material.transparent = true;
    source.material.opacity = 0.7;
    source.material.depthWrite = false;
    source.name = 'source';
    source.position.set(-1.125, -0.05 + EPS, 0);
    source.castShadow = true;
    source.receiveShadow = true;
    group.add(source);

    // Drain (Right Well) - Embedded
    const drainGeo = new RoundedBoxGeometry(1.20, 0.5, 3.02, 4, 0.05);
    const drain = new THREE.Mesh(drainGeo, materials.siliconActive);
    drain.material = materials.siliconActive.clone();
    drain.material.transparent = true;
    drain.material.opacity = 0.7;
    drain.material.depthWrite = false;
    drain.name = 'drain';
    drain.position.set(1.125, -0.05 + EPS, 0);
    drain.castShadow = true;
    drain.receiveShadow = true;
    group.add(drain);
    
    // Channel - On top of Substrate Center (-0.1)
    const channelGeo = new RoundedBoxGeometry(1, channelThickness, 3, 4, 0.02);
    const channel = new THREE.Mesh(channelGeo, materials.silicon); 
    channel.material = materials.silicon.clone();
    channel.material.transparent = true;
    channel.material.opacity = 0.7;
    channel.material.depthWrite = false;
    channel.name = 'channel';
    channel.position.y = channelTopY + channelThickness / 2 - EPS * 2;
    channel.scale.set(1.02, 1.0, 1.02);
    group.add(channel);

    // Gate Oxide - Above Channel
    const oxideThickness = 0.05;
    const oxideGeo = new RoundedBoxGeometry(1, oxideThickness, 3, 4, 0.01);
    const oxide = new THREE.Mesh(oxideGeo, materials.oxide);
    oxide.position.y = channelTopY + channelThickness + oxideThickness / 2 + EPS * 3;
    group.add(oxide);

    // Gate - Above the oxide
    const gateGeo = new RoundedBoxGeometry(1, 0.6, 3, 4, 0.05);
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.y = channelTopY + channelThickness + oxideThickness + 0.6 / 2 + EPS * 4;
    gate.castShadow = true;
    gate.receiveShadow = true;
    group.add(gate);
    
    scene.add(group);
    particleSystem.init('planar', scene, group);
    return group;
}

// 2. SOI MOSFET (Silicon On Insulator)
export function createSOICMOS(scene, particleSystem) {
    const group = new THREE.Group();

    // Substrate (Base)
    const substrateGeo = new RoundedBoxGeometry(4.5, 1.2, 3, 4, 0.1);
    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.position.y = -1.3;
    substrate.receiveShadow = true;
    group.add(substrate);

    // BOX (Buried Oxide)
    const boxThickness = 0.2;
    const boxGeo = new THREE.BoxGeometry(4.5, boxThickness, 3);
    const box = new THREE.Mesh(boxGeo, materials.oxide);
    box.position.y = -0.6 + EPS;
    box.receiveShadow = true;
    group.add(box);

    const yTop = 0.2;
    const channelThickness = 0.1;
    const channelTopY = yTop - channelThickness;

    const boxTopY = box.position.y + boxThickness / 2;
    const fillBottomY = boxTopY + EPS * 2;
    const fillTopY = channelTopY;
    const fillHeight = Math.max(0.05, fillTopY - fillBottomY);

    const fillMaterial = materials.silicon.clone();
    fillMaterial.color = new THREE.Color(0x444466);

    const fillGeo = new RoundedBoxGeometry(4.5, fillHeight, 3, 4, 0.08);
    const fill = new THREE.Mesh(fillGeo, fillMaterial);
    fill.position.y = fillBottomY + fillHeight / 2;
    fill.receiveShadow = true;
    group.add(fill);

    // Source/Drain - Same as Planar
    const sourceGeo = new RoundedBoxGeometry(1.20, 0.5, 3.02, 4, 0.05);
    const source = new THREE.Mesh(sourceGeo, materials.siliconActive);
    source.material = materials.siliconActive.clone();
    source.material.transparent = true;
    source.material.opacity = 0.7;
    source.material.depthWrite = false;
    source.name = 'source';
    source.position.set(-1.125, -0.05 + EPS, 0);
    source.castShadow = true;
    group.add(source);

    const drainGeo = new RoundedBoxGeometry(1.20, 0.5, 3.02, 4, 0.05);
    const drain = new THREE.Mesh(drainGeo, materials.siliconActive);
    drain.material = materials.siliconActive.clone();
    drain.material.transparent = true;
    drain.material.opacity = 0.7;
    drain.material.depthWrite = false;
    drain.name = 'drain';
    drain.position.set(1.125, -0.05 + EPS, 0);
    drain.castShadow = true;
    group.add(drain);

    const channelGeo = new RoundedBoxGeometry(1, channelThickness, 3, 4, 0.02);
    const channel = new THREE.Mesh(channelGeo, materials.silicon);
    channel.material = materials.silicon.clone();
    channel.material.transparent = true;
    channel.material.opacity = 0.7;
    channel.material.depthWrite = false;
    channel.name = 'channel';
    channel.position.y = channelTopY + channelThickness / 2 - EPS * 2;
    channel.scale.set(1.02, 1.0, 1.02);
    group.add(channel);

    const oxideThickness = 0.05;
    const oxideGeo = new RoundedBoxGeometry(1, oxideThickness, 3, 4, 0.01);
    const oxide = new THREE.Mesh(oxideGeo, materials.oxide);
    oxide.position.y = channelTopY + channelThickness + oxideThickness / 2 + EPS * 3;
    group.add(oxide);

    const gateGeo = new RoundedBoxGeometry(1, 0.6, 3, 4, 0.05);
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.y = channelTopY + channelThickness + oxideThickness + 0.6 / 2 + EPS * 4;
    gate.castShadow = true;
    group.add(gate);

    scene.add(group);
    particleSystem.init('soi', scene, group);
    return group;
}

// 3. FinFET
export function createFinFET(scene, particleSystem) {
    const group = new THREE.Group();

    // Substrate
    const substrateGeo = new RoundedBoxGeometry(4.6, 0.5, 3.1, 4, 0.1);
    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.position.y = -0.5;
    substrate.receiveShadow = true;
    group.add(substrate);

    // Fins (Multiple)
    const finGeo = new RoundedBoxGeometry(4.6, 0.8, 0.3, 4, 0.03);
    
    const fin1 = new THREE.Mesh(finGeo, materials.siliconActive);
    fin1.position.set(0, 0.15 + EPS, -0.6); 
    fin1.castShadow = true;
    group.add(fin1);

    const fin2 = new THREE.Mesh(finGeo, materials.siliconActive);
    fin2.position.set(0, 0.15 + EPS, 0.6);
    fin2.castShadow = true;
    group.add(fin2);

    // Oxide (Isolation between fins - STI)
    const stiGeo = new RoundedBoxGeometry(4.5, 0.4, 3.0, 4, 0.04);
    const sti = new THREE.Mesh(stiGeo, new THREE.MeshPhysicalMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.1
    })); 
    sti.position.y = -0.05 + EPS; 
    sti.receiveShadow = true;
    group.add(sti);

    // Gate
    const gateGeo = new RoundedBoxGeometry(1.25, 1.25, 3.2, 4, 0.05);
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.set(0, 0.5, 0);
    gate.material = materials.gateMetal.clone();
    gate.material.transparent = true;
    gate.material.opacity = 0.7;
    gate.castShadow = true;
    group.add(gate);

    scene.add(group);
    particleSystem.init('finfet', scene, group);
    return group;
}

// 4. GAAFET (Gate-All-Around / Nanosheet)
export function createGAAFET(scene, particleSystem) {
    const group = new THREE.Group();

    // Substrate
    const substrateGeo = new RoundedBoxGeometry(4.5, 0.5, 3, 4, 0.1);
    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.position.y = -1.5;
    substrate.receiveShadow = true;
    group.add(substrate);

    // Source and Drain Pillars
    const sdGeo = new RoundedBoxGeometry(0.6, 2, 3, 4, 0.05);
    const source = new THREE.Mesh(sdGeo, materials.siliconActive);
    source.material = materials.siliconActive.clone();
    source.material.transparent = true;
    source.material.opacity = 0.7;
    source.material.depthWrite = false;
    source.position.set(-1.8, -0.5 + EPS, 0);
    source.castShadow = true;
    group.add(source);

    const drain = new THREE.Mesh(sdGeo, materials.siliconActive);
    drain.material = materials.siliconActive.clone();
    drain.material.transparent = true;
    drain.material.opacity = 0.7;
    drain.material.depthWrite = false;
    drain.position.set(1.8, -0.5 + EPS, 0);
    drain.castShadow = true;
    group.add(drain);

    // Nanosheets
    const sheetGeo = new RoundedBoxGeometry(3.6, 0.15, 1, 4, 0.015);
    
    for(let i = 0; i < 3; i++) {
        const sheet = new THREE.Mesh(sheetGeo, materials.silicon);
        sheet.position.set(0, -1.0 + (i * 0.6) + EPS, 0); 
        sheet.castShadow = true;
        group.add(sheet);
    }

    // Gate
    const gateGeo = new RoundedBoxGeometry(1.0, 2.25, 2.55, 4, 0.05); 
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.set(0, -0.4, 0);
    gate.material = materials.gateMetal.clone();
    gate.material.transparent = true;
    gate.material.opacity = 0.7;
    gate.castShadow = true;
    group.add(gate);

    scene.add(group);
    particleSystem.init('gaafet', scene, group);
    return group;
}

