import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Box, CircularProgress, Typography } from "@mui/material";

interface ThreeDViewerProps {
  downloadUrl: string;
  filename: string;
}

export default function ThreeDViewer({ downloadUrl, filename }: ThreeDViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f13); // Match the Kollab dark preview layout

    // Add Grid Helper
    const gridHelper = new THREE.GridHelper(200, 50, 0x3a3a4a, 0x22222a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; // Don't go below the grid plane

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x777777);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1.5, 1).normalize();
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8899aa, 0.4);
    dirLight2.position.set(-1, -1, -1).normalize();
    scene.add(dirLight2);

    let activeMesh: THREE.Object3D | null = null;

    // 6. Model Loading
    const nameLower = filename.toLowerCase();
    const loader = nameLower.endsWith(".3mf") ? new ThreeMFLoader() : new STLLoader();

    setLoading(true);
    setError(null);

    loader.load(
      downloadUrl,
      (loadedObject) => {
        setLoading(false);

        // Material setup (sleek metallic blue look)
        const material = new THREE.MeshStandardMaterial({
          color: 0x90caf9,
          roughness: 0.35,
          metalness: 0.4,
          flatShading: true,
          side: THREE.DoubleSide
        });

        const box = new THREE.Box3();

        if (loadedObject instanceof THREE.BufferGeometry) {
          // STL Loader returns geometry directly
          loadedObject.computeVertexNormals();
          loadedObject.center(); // Center geometry around origin
          
          const mesh = new THREE.Mesh(loadedObject, material);
          scene.add(mesh);
          activeMesh = mesh;
          
          box.setFromObject(mesh);
        } else {
          // 3MF Loader returns a Group/Object3D
          loadedObject.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = material;
            }
          });
          
          // Center group
          box.setFromObject(loadedObject);
          const center = new THREE.Vector3();
          box.getCenter(center);
          loadedObject.position.sub(center);
          
          scene.add(loadedObject);
          activeMesh = loadedObject;
          
          // Reset box from centered object
          box.setFromObject(loadedObject);
        }

        // Auto-center and position camera
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.4; // Leave some margins around the model

        camera.position.set(cameraZ, cameraZ * 0.8, cameraZ);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => {
        console.error("Error loading 3D file:", err);
        setLoading(false);
        setError("Failed to parse the 3D model. Make sure it is a valid STL or 3MF file.");
      }
    );

    // 7. Animation / Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize handler
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      // Memory cleanup
      scene.clear();
      renderer.dispose();
      if (activeMesh) {
        activeMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, [downloadUrl, filename]);

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f13",
            zIndex: 5
          }}
        >
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading 3D model viewport...
          </Typography>
        </Box>
      )}

      {error && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f13",
            color: "error.main",
            p: 3,
            textAlign: "center",
            zIndex: 5
          }}
        >
          <Typography variant="body1">{error}</Typography>
        </Box>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />
    </Box>
  );
}
