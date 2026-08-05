import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import './App.css'

function SpinningCube() {
  return (
    <mesh rotation={[0.4, 0.4, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#5b8def" />
    </mesh>
  )
}

function App() {
  return (
    <div id="game-root">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <SpinningCube />
          <Environment preset="city" />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
