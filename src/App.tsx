import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Center,
  Environment,
  OrbitControls,
  PresentationControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

// GLBファイルを読み込んで表示するコンポーネント
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function App() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // ファイルをURLに変換して読み込む
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setModelName(file.name.split(".")[0]);
    }
  };

  const handleCaptureThumbnail = async () => {
    if (!displayCanvasRef.current) {
      throw new Error("Failed to get display canvas");
    }
    const sourceCanvas = displayCanvasRef.current;

    // 4:3の比率で800x600pxのオフスクリーンCanvasを作成
    const targetWidth = 800;
    const targetHeight = 600;
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = targetWidth;
    offscreenCanvas.height = targetHeight;
    const ctx = offscreenCanvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }

    // ソースCanvasから中央部分を4:3の比率でクロップして描画
    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = sourceWidth;
    let sHeight = sourceHeight;

    // 4:3の比率でクロップ
    if (sourceAspect > targetAspect) {
      // ソースの方が横長の場合、横をクロップ
      sWidth = sourceHeight * targetAspect;
      sx = (sourceWidth - sWidth) / 2;
    } else {
      // ソースの方が縦長の場合、縦をクロップ
      sHeight = sourceWidth / targetAspect;
      sy = (sourceHeight - sHeight) / 2;
    }

    // クロップした部分を描画
    ctx.drawImage(
      sourceCanvas,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // BlobとしてPNG画像を返す
    const thumbnail = await new Promise<Blob>((resolve, reject) => {
      offscreenCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create thumbnail blob"));
        }
      }, "image/png");
    });

    // Blobから画像ファイルとしてダウンロード
    const url = URL.createObjectURL(thumbnail);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <input
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileChange}
        style={{ display: "block", margin: "10px" }}
      />
      <button onClick={handleCaptureThumbnail}>Capture Thumbnail</button>
      <div className="app">
        <Canvas
          shadows
          camera={{ position: [0, 2, 5], fov: 50 }}
          gl={{
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          onCreated={({ gl }) => {
            displayCanvasRef.current = gl.domElement;
          }}
        >
          <Environment preset="apartment" background={false} />
          <directionalLight
            castShadow
            position={[2.5, 8, 5]}
            intensity={1.5}
            shadow-mapSize={1024}
          >
            {/* 影のボケ具合を調整 */}
            <orthographicCamera
              attach="shadow-camera"
              args={[-10, 10, -10, 10]}
            />
          </directionalLight>
          <PresentationControls
            global={false} // trueにすると画面全体どこでも掴める
            cursor={true} // カーソルをgrabアイコンにする
            snap={false} // 手を離すと元の角度に戻る（falseならその場で止まる）
            rotation={[0, 0, 0]} // Default rotation
            zoom={1}
            polar={[-Infinity, Infinity]} // Vertical limits
            azimuth={[-Infinity, Infinity]} // Horizontal limits
          >
            {modelUrl && (
              <Center>
                <Model url={modelUrl} />
              </Center>
            )}
          </PresentationControls>
          <OrbitControls
            enableRotate={false} // 回転はPresentationControlsに任せるのでOFF
            enableZoom={true} // ズームだけON！
          />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
