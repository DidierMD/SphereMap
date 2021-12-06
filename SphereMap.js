
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';


const SatelliteT1 = 0;
const SatelliteT2 = 1;

class SatellitesEngine{
	constructor(type1_size, type2_size, orbit_radius, damping){
		this.Sizes = [type1_size, type2_size]
		this.Damping = damping;
		this.OrbitRadius = orbit_radius;
		this.Satellites = {};
	}

	addSatellite(id, type, initial_position, final_position){ 
		// Create 3d obj
		this.Satellites[id] = {"3D_obj" : this.#getSatellite3DObj(type)};
		// Set initial position
		let pos = new THREE.Spherical(this.OrbitRadius,
												initial_position.y * Math.PI,
												initial_position.x * 2.0 * Math.PI);
		this.Satellites[id]["3D_obj"].position.setFromSpherical(pos);
		this.Satellites[id]["3D_obj"].lookAt(0,0,0);
		// Set final position
		let fin_pos = new THREE.Spherical(this.OrbitRadius,
												final_position.y * Math.PI,
												final_position.x * 2.0 * Math.PI);
		this.Satellites[id]["final_position"] = new THREE.Vector3().setFromSpherical(fin_pos);
		return this.Satellites[id]["3D_obj"];
	}

	deleteSatellite(id, parent_obj){
		parent_obj.remove(this.Satellites[id]["3D_obj"]);
		this.Satellites[id]["3D_obj"].material.dispose();
		this.Satellites[id]["3D_obj"].geometry.dispose();
		delete this.Satellites[id];
	}

	#getSatellite3DObj(type){
		let geometry = null;
		let material_options = null;
		let material = null;
		switch(type){
			case SatelliteT1: 
				geometry = new THREE.OctahedronGeometry(this.Sizes[type]);
				material_options = {color : 'rgb(100,250,20)',
				  						blending : THREE.NormalBlending};
				material = new THREE.MeshLambertMaterial(material_options);
				return new THREE.Mesh(geometry, material);
			break;
			case SatelliteT2:
				geometry = new THREE.TetrahedronGeometry(this.Sizes[type]);
				material_options = {color : 'rgb(200,100,20)',
				  						blending : THREE.NormalBlending};
				material = new THREE.MeshLambertMaterial(material_options);
				return new THREE.Mesh(geometry, material);
			break;
		}
	}

	updatePositions(time_delta){
		for(let sat in this.Satellites){
			// Get others positions influence
			let from_others = new THREE.Vector3(0,0,0);
			let diff = new THREE.Vector3();
			for(let other in this.Satellites){
				if (sat != other){
					diff.subVectors(this.Satellites[sat]["3D_obj"].position, 
										 this.Satellites[other]["3D_obj"].position);
					diff.divideScalar(diff.lengthSq());
					from_others.add(diff);
				}
			}
			let to_final_pos = new THREE.Vector3().crossVectors(this.Satellites[sat]["3D_obj"].position, 
																			this.Satellites[sat]["final_position"]);
			to_final_pos.cross(this.Satellites[sat]["3D_obj"].position).normalize();
			to_final_pos.multiplyScalar(this.Satellites[sat]["3D_obj"].position.distanceTo(this.Satellites[sat]["final_position"]));
			let to_move = new THREE.Vector3().addVectors(from_others, to_final_pos).multiplyScalar(time_delta * this.Damping);
			this.Satellites[sat]["3D_obj"].position.add(to_move);
			this.Satellites[sat]["3D_obj"].position.setLength(this.OrbitRadius);
			this.Satellites[sat]["3D_obj"].lookAt(0,0,0);
		}
	}
}


class SphereMap{
	#DoRenderContinuosly = true;

	constructor(sphere_size, sphere_segments, sphere_ang_vel, debug = false){
		// General needed objects creation
		this.Scene = new THREE.Scene();
		this.Debug = debug;
		this.Clock = new THREE.Clock();
		this.#DoRenderContinuosly = true;

		// Initial geometries creation
		var texture_loader = new THREE.TextureLoader();
		this.Sphere = this.#getSphere(sphere_size, sphere_segments, texture_loader);
		this.SphereAngularVelocity = sphere_ang_vel;
		this.SphereSize = sphere_size;
		this.Halo = this.#getHalo(sphere_size*1.2, sphere_segments);
		this.Satellites = new SatellitesEngine(this.SphereSize / 13, this.SphereSize / 16, this.SphereSize*1.2, 0.2);

		// Lights
		this.Light1 = new THREE.DirectionalLight('rgb(255,255,255)', 1);
		this.Light1.position.set(-10, 11, 5);
		this.Light2 = new THREE.DirectionalLight('rgb(244,99,190)', 1);
		this.Light2.position.set(10, -11, 0);

		this.Camera = new THREE.PerspectiveCamera(
				35,
				window.innerWidth/window.innerHeight,
				1,
				1000);
		this.Camera.position.x = 1;
		this.Camera.position.y = 2;
		this.Camera.position.z = 5;
		//this.Camera.lookAt(new THREE.Vector3(0, 0, 0));
		this.Camera.add(this.Light1);
		this.Camera.add(this.Light2);

		// Add objects to the scene
		this.Scene.add(this.Sphere);
		this.Scene.add(this.Halo);
		this.Scene.add(this.Camera);

		// Renderer
		this.Renderer = new THREE.WebGLRenderer({antialias:true});
		this.Renderer.setSize(window.innerWidth, window.innerHeight);
		this.Renderer.setClearColor('rgb(0, 0, 0)');

		// Controls
		this.Controls = new OrbitControls(this.Camera, 
																this.domElement);
		this.Controls.enableZoom = false;
		this.Controls.maxPolarAngle = 2.0 * Math.PI/3.0;
		this.Controls.minPolarAngle = Math.PI/3.0;

		if (debug){
			this.Gui = new dat.GUI();
			let fold1 = this.Gui.addFolder("Light1");
			fold1.add(this.Light1, 'intensity', 0, 10);
			fold1.add(this.Light1.position, 'x', -20, 20);
			fold1.add(this.Light1.position, 'y', -20, 20);
			fold1.add(this.Light1.position, 'z', -20, 20);
			let fold2 = this.Gui.addFolder("Light2");
			fold2.add(this.Light2, 'intensity', 0, 10); 
			fold2.add(this.Light2.position, 'x', -20, 20);
			fold2.add(this.Light2.position, 'y', -20, 20);	
			fold2.add(this.Light2.position, 'z', -20, 20);	
		}
	}

	get domElement(){
		return this.Renderer.domElement;
	}
	
	renderFrame(){
		this.Renderer.render(this.Scene, this.Camera);
		this.Controls.update();
	}
	
	updateAnimation(time_delta){
		this.Sphere.rotation.y += this.SphereAngularVelocity * time_delta;
		this.Satellites.updatePositions(time_delta);
	}

	renderContinuosly(){
		if (this.#DoRenderContinuosly){
			this.renderFrame();
			this.updateAnimation(this.Clock.getDelta());
			requestAnimationFrame(() => { this.renderContinuosly(); });
		}
		else{
			this.#DoRenderContinuosly = true;
		}
	}

	stopRendering(){
		this.#DoRenderContinuosly = false;
	}

	#EarthVertexShader = `varying vec2 vertex_uv;
varying vec3 vertex_normal;

void main(){
	vertex_uv = uv;
	vertex_normal = normalize(normalMatrix * normal);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
	#EarthFragmentShader = `uniform sampler2D earth_texture;
varying vec2 vertex_uv;
varying vec3 vertex_normal;

void main(){
	float intensity = 1.01 - dot(vertex_normal, vec3(0.0, 0.0, 1.0));
	vec3 soft_glow = vec3(0.3, 0.5, 1.0) * pow(intensity, 1.5);
	gl_FragColor = vec4(soft_glow + texture2D(earth_texture, vertex_uv).xyz, 1.0);
}`;
	#getSphere(size, segments, texture_loader){
		let geometry = new THREE.SphereGeometry(size, segments, segments);
		//geometry.computeVertexNormals();
		//let material_options = {color : 'rgb(255,255,255)',
		//				map : texture_loader.load('img/2k_earth_nightmap.jpg')};
		//let material = new THREE.MeshStandardMaterial(material_options);
		let material_options = { vertexShader : this.#EarthVertexShader,
										 fragmentShader : this.#EarthFragmentShader,
										 uniforms: {
											 earth_texture:{
												 value: texture_loader.load('img/2k_earth_nightmap.jpg')
											 }
										 }
		}
		let material = new THREE.ShaderMaterial(material_options);
		return new THREE.Mesh(geometry, material);
	}

	#HaloVertexShader = `varying vec3 vertexNormal;
void main(){
	vertexNormal = normalize(normalMatrix * normal);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
	#HaloFragmentShader = `varying vec3 vertexNormal;
void main(){
	float intensity = pow(0.5 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
	gl_FragColor = vec4(0.5, 0.6, 1.0, 1.0) * intensity;
}`
	#getHalo(size, segments){
		let geometry = new THREE.SphereGeometry(size, segments, segments);
		let material_options = {vertexShader : this.#HaloVertexShader,
										fragmentShader : this.#HaloFragmentShader,
										blending : THREE.AdditiveBlending,
										side:	THREE.BackSide,
										transparent : true
										};
		let material = new THREE.ShaderMaterial(material_options);
		return new THREE.Mesh(geometry, material);
	}

	addSatellite(id, type, initial_position, final_position){
		let new_satellite = this.Satellites.addSatellite(id, type, initial_position, final_position);
		this.Scene.add(new_satellite);
	}

	deleteSatellite(id){
		this.Satellites.deleteSatellite(id, this.Scene);
	}
}

export { SphereMap }
