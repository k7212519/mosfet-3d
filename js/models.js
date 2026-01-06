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
    const substrateGeo = new RoundedBoxGeometry(4.5, 0.6, 3, 4, 0.1);
    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.position.y = -1.0;
    substrate.receiveShadow = true;
    group.add(substrate);

    const yTop = 0.2;
    const channelThickness = 0.1;
    const channelTopY = yTop - channelThickness;

    // D/S geometry reference (same as Planar)
    const sdWidth = 1.20;
    const sdHeight = 0.5;
    const sdCenterX = 1.125;
    const sdCenterY = -0.05;
    const sdBottomY = sdCenterY - sdHeight / 2;

    // BOX is an opaque U-shape (single solid path)
    const boxThickness = 0.4;
    const boxTopY = sdBottomY; // This variable name is confusing, it's actually the "Shelf" top? 
                               // Wait, boxTopY in previous code was sdBottomY.
                               // But now BOX goes up to yTop.
    const boxBaseTopY = sdBottomY; // The floor of the U
    const boxBottomY = boxBaseTopY - boxThickness; // The bottom of the U base

    // Bevel settings
    const bevelSz = 0.04; 

    // Compensate for bevel thickness in depth
    // Total depth should be strictly less than substrate (3.0) to avoid protrusion
    // Target Total Depth = 2.9
    const sideDepth = 2.9 - 2 * bevelSz;
    
    // Target Total Width = 4.4 (Half = 2.2) to fit inside substrate (4.5)
    const halfW = 2.2;
    const centerW = 1.06; // Width of center fill (2 * 0.53 to slightly overlap 0.525)

    const boxShape = new THREE.Shape();
    const rBox = 0.1; // Matches substrate radius
    
    // Calculate inner width to clear the D/S blocks
    // D/S outer edge is at 1.125 + 0.6 = 1.725
    // We want the wall to start slightly outside that.
    const innerHalfW = 1.75; 
    
    const rInner = 0.08; 

    // Compensate for bevel expansion
    // Outer boundaries (Bevel pushes OUT)
    const drawTopY = yTop - bevelSz;          
    const drawBottomY = boxBottomY + bevelSz; 
    const drawHalfW = halfW - bevelSz;        // Compensate width
    const drawRBox = rBox - bevelSz;          // Compensate radius

    // Inner boundaries (Bevel pushes INTO the void/material?)
    // Inner Floor (Normal Up) -> Bevel moves Up. Target: boxBaseTopY. Draw: boxBaseTopY - bevelSz.
    const drawInnerBottomY = boxBaseTopY - bevelSz;

    // Inner Side Wall (Normal Inwards/Center). Bevel moves Inwards. 
    // Target: innerHalfW. Draw: innerHalfW + bevelSz.
    const drawInnerHalfW = innerHalfW + bevelSz;

    // Draw U-shape perimeter (Solid wall + bottom)
    // Start: Outer Top-Left (flat part)
    boxShape.moveTo(-drawHalfW, drawTopY - drawRBox);
    
    // Left Wall Down
    boxShape.lineTo(-drawHalfW, drawBottomY + drawRBox);
    boxShape.quadraticCurveTo(-drawHalfW, drawBottomY, -drawHalfW + drawRBox, drawBottomY);
    
    // Bottom
    boxShape.lineTo(drawHalfW - drawRBox, drawBottomY);
    boxShape.quadraticCurveTo(drawHalfW, drawBottomY, drawHalfW, drawBottomY + drawRBox);
    
    // Right Wall Up
    boxShape.lineTo(drawHalfW, drawTopY - drawRBox);
    boxShape.quadraticCurveTo(drawHalfW, drawTopY, drawHalfW - drawRBox, drawTopY);
    
    // Right Top Flat (Inward)
    boxShape.lineTo(drawInnerHalfW, drawTopY);
    
    // Right Inner Wall Down
    boxShape.lineTo(drawInnerHalfW, drawInnerBottomY + rInner);
    boxShape.quadraticCurveTo(drawInnerHalfW, drawInnerBottomY, drawInnerHalfW - rInner, drawInnerBottomY);
    
    // Inner Bottom
    boxShape.lineTo(-drawInnerHalfW + rInner, drawInnerBottomY);
    boxShape.quadraticCurveTo(-drawInnerHalfW, drawInnerBottomY, -drawInnerHalfW, drawInnerBottomY + rInner);
    
    // Left Inner Wall Up
    boxShape.lineTo(-drawInnerHalfW, drawTopY);
    
    // Left Top Flat (Outward)
    boxShape.lineTo(-drawHalfW + drawRBox, drawTopY);
    boxShape.quadraticCurveTo(-drawHalfW, drawTopY, -drawHalfW, drawTopY - drawRBox); // Back to start

    const boxExtrudeSettings = {
        steps: 1,
        depth: sideDepth,
        bevelEnabled: true,
        bevelThickness: bevelSz,
        bevelSize: bevelSz,
        bevelSegments: 4 // smoother bevel
    };
    const boxGeo = new THREE.ExtrudeGeometry(boxShape, boxExtrudeSettings);
    boxGeo.translate(0, 0, -sideDepth / 2);

    const boxMaterial = materials.oxide.clone();
    boxMaterial.transparent = false;
    boxMaterial.opacity = 1;
    const boxLayer = new THREE.Mesh(boxGeo, boxMaterial);
    boxLayer.receiveShadow = true;
    group.add(boxLayer);

    // Middle silicon fill under channel (different color), bottom aligned with D/S bottom
    const fillTopY = channelTopY - EPS * 2;
    const fillHeight = Math.max(0.05, fillTopY - sdBottomY);
    const fillMaterial = materials.silicon.clone();
    fillMaterial.color = new THREE.Color(0x444466);
    const fillGeo = new THREE.BoxGeometry(centerW, fillHeight, 2.9);
    const fill = new THREE.Mesh(fillGeo, fillMaterial);
    fill.position.y = (sdBottomY + fillTopY) / 2;
    fill.receiveShadow = true;
    group.add(fill);

    // Source/Drain - Same as Planar
    const sourceGeo = new RoundedBoxGeometry(sdWidth, sdHeight, 2.9, 4, 0.05);
    const source = new THREE.Mesh(sourceGeo, materials.siliconActive);
    source.material = materials.siliconActive.clone();
    source.material.transparent = true;
    source.material.opacity = 0.7;
    source.material.depthWrite = false;
    source.name = 'source';
    source.position.set(-sdCenterX, sdCenterY + EPS, 0);
    source.castShadow = true;
    group.add(source);

    const drainGeo = new RoundedBoxGeometry(sdWidth, sdHeight, 2.9, 4, 0.05);
    const drain = new THREE.Mesh(drainGeo, materials.siliconActive);
    drain.material = materials.siliconActive.clone();
    drain.material.transparent = true;
    drain.material.opacity = 0.7;
    drain.material.depthWrite = false;
    drain.name = 'drain';
    drain.position.set(sdCenterX, sdCenterY + EPS, 0);
    drain.castShadow = true;
    group.add(drain);

    const channelGeo = new RoundedBoxGeometry(1, channelThickness, 2.9, 4, 0.02);
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
    const oxideGeo = new RoundedBoxGeometry(1, oxideThickness, 2.9, 4, 0.01);
    const oxide = new THREE.Mesh(oxideGeo, materials.oxide);
    oxide.position.y = channelTopY + channelThickness + oxideThickness / 2 + EPS * 3;
    group.add(oxide);

    const gateGeo = new RoundedBoxGeometry(1, 0.6, 2.9, 4, 0.05);
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
    
    // 3 Fins with spacing
    const positions = [-0.6, 0, 0.6];
    
    positions.forEach(z => {
        const fin = new THREE.Mesh(finGeo, materials.siliconActive);
        fin.material = materials.siliconActive.clone();
        fin.material.transparent = true;
        fin.material.opacity = 0.7;
        fin.material.depthWrite = false;
        fin.position.set(0, 0.15 + EPS, z);
        fin.castShadow = true;
        group.add(fin);
    });

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
    const gateGeo = new RoundedBoxGeometry(1.25, 1.0, 3.2, 4, 0.03);
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.set(0, 0.25, 0); 
    gate.material = materials.gateMetal.clone();
    gate.castShadow = true;
    group.add(gate);

    scene.add(group);
    particleSystem.init('finfet', scene, group);
    return group;
}

// 4. GAAFET (Gate-All-Around / Nanosheet)
export function createGAAFET(scene, particleSystem) {
    const group = new THREE.Group();

    // 1. Substrate (Same as FinFET)
    const substrateGeo = new RoundedBoxGeometry(4.6, 0.5, 3.1, 4, 0.1);
    const substrate = new THREE.Mesh(substrateGeo, materials.substrate);
    substrate.position.y = -0.5;
    substrate.receiveShadow = true;
    group.add(substrate);

    // 2. Nanosheets (3x3 Grid)
    // 3 horizontal stacks (Z) x 3 vertical stacks (Y)
    const sheetGeo = new RoundedBoxGeometry(4.6, 0.14, 0.3, 4, 0.02);
    
    const zPositions = [-0.6, 0, 0.6];
    const yPositions = [0.3, 0.6, 0.9]; // Increased spacing

    zPositions.forEach(z => {
        yPositions.forEach(y => {
            const sheet = new THREE.Mesh(sheetGeo, materials.siliconActive);
            sheet.material = materials.siliconActive.clone();
            sheet.material.transparent = true;
            sheet.material.opacity = 0.7;
            sheet.material.depthWrite = false;
            sheet.position.set(0, y, z);
            sheet.castShadow = true;
            group.add(sheet);
        });
    });

    // 3. Oxide (STI) - Isolation (Same as FinFET)
    const stiGeo = new RoundedBoxGeometry(4.5, 0.4, 3.0, 4, 0.04);
    const sti = new THREE.Mesh(stiGeo, new THREE.MeshPhysicalMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.1
    })); 
    sti.position.y = -0.05 + EPS; 
    sti.receiveShadow = true;
    group.add(sti);

    // 4. Gate (Same as FinFET)
    const gateGeo = new RoundedBoxGeometry(1.25, 1.4, 3.2, 4, 0.03);
    const gate = new THREE.Mesh(gateGeo, materials.gateMetal);
    gate.position.set(0, 0.45, 0); 
    gate.material = materials.gateMetal.clone();
    gate.castShadow = true;
    group.add(gate);

    scene.add(group);
    particleSystem.init('gaafet', scene, group);
    return group;
}

