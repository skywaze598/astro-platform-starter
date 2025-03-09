import React, { useRef, useState, useEffect } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [selectionMode, setSelectionMode] = useState("libre");
  const [drawing, setDrawing] = useState(false);
  const [selectionPath, setSelectionPath] = useState([]);
  const [startPos, setStartPos] = useState(null);
  const [selectionSize, setSelectionSize] = useState({ width: 0, height: 0, radius: 0 });
  const [selectedArea, setSelectedArea] = useState(null);
  const [layers, setLayers] = useState([]);
  const [brightness, setBrightness] = useState(1); // Contrôle de la luminosité

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => setImage(img);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
    }
  }, [image]);

  const startSelection = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setStartPos({ x: startX, y: startY });
    if (selectionMode === "libre") setSelectionPath([{ x: startX, y: startY }]);
    setDrawing(true);
  };

  const drawSelection = (e) => {
    if (!drawing || !startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    if (selectionMode === "libre") {
      setSelectionPath((prevPath) => [...prevPath, { x: currentX, y: currentY }]);
    } else {
      const width = currentX - startPos.x;
      const height = currentY - startPos.y;
      const radius = Math.sqrt(width ** 2 + height ** 2);
      setSelectionSize({ width, height, radius });
    }
    redrawCanvas();
  };

  const stopSelection = () => {
    setDrawing(false);
    saveSelection();
  };

  const saveSelection = () => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let selectedImageData;
    if (selectionMode === "rectangle") {
      selectedImageData = ctx.getImageData(startPos.x, startPos.y, selectionSize.width, selectionSize.height);
    } else if (selectionMode === "cercle") {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.beginPath();
      tempCtx.arc(startPos.x, startPos.y, selectionSize.radius, 0, 2 * Math.PI);
      tempCtx.clip();
      tempCtx.drawImage(canvas, 0, 0);
      selectedImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    }
    setSelectedArea(selectedImageData);

    // Ajout du nouveau calque à la liste des calques
    setLayers((prevLayers) => [...prevLayers, selectedImageData]);
  };

  const applySelection = () => {
    if (!canvasRef.current || !selectedArea) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(selectedArea, 0, 0);
  };

  const zoomSelection = () => {
    if (!selectedArea || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const zoomFactor = 1.5;
    canvas.width = selectedArea.width * zoomFactor;
    canvas.height = selectedArea.height * zoomFactor;
    ctx.putImageData(selectedArea, 0, 0);
    ctx.drawImage(canvas, 0, 0, selectedArea.width * zoomFactor, selectedArea.height * zoomFactor);
  };

  const enlargeSelection = () => {
    setSelectionSize((prevSize) => ({
      width: prevSize.width * 1.1,
      height: prevSize.height * 1.1,
      radius: prevSize.radius * 1.1,
    }));
    redrawCanvas();
  };

  const shrinkSelection = () => {
    setSelectionSize((prevSize) => ({
      width: prevSize.width * 0.9,
      height: prevSize.height * 0.9,
      radius: prevSize.radius * 0.9,
    }));
    redrawCanvas();
  };

  // Fonction pour diminuer la luminosité en multipliant les valeurs RGB par un facteur
  const adjustBrightness = (factor) => {
    setBrightness(factor);
    const newLayers = layers.map((layer) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = layer.width;
      tempCanvas.height = layer.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.putImageData(layer, 0, 0);
      
      // Appliquer un ajustement de luminosité
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Appliquer un facteur de luminosité aux canaux RGB
        data[i] = Math.max(0, Math.min(255, data[i] * factor));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor)); // B
      }
      tempCtx.putImageData(imageData, 0, 0);
      return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    });
    setLayers(newLayers);
    redrawCanvas();
  };

  const redrawCanvas = () => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Dessiner les calques sur le canevas avec luminosité appliquée
    layers.forEach((layer, index) => {
      ctx.putImageData(layer, 0, 0);
    });

    if (!startPos) return;
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    if (selectionMode === "rectangle") {
      ctx.strokeRect(startPos.x, startPos.y, selectionSize.width, selectionSize.height);
    } else if (selectionMode === "cercle") {
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, selectionSize.radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  return (
    <div className="App">
      <h1>Éditeur d'images</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={applySelection}>Appliquer la sélection</button>
      <button onClick={zoomSelection}>🔍 Zoomer sur la sélection</button>
      <button onClick={enlargeSelection}>🔼 Agrandir la sélection</button>
      <button onClick={shrinkSelection}>🔽 Réduire la sélection</button>
      <select value={selectionMode} onChange={(e) => setSelectionMode(e.target.value)}>
        <option value="libre">Libre</option>
        <option value="rectangle">Rectangle</option>
        <option value="cercle">Cercle</option>
      </select>
      <button onClick={() => adjustBrightness(1.2)}>Augmenter la luminosité</button>
      <button onClick={() => adjustBrightness(0.8)}>Diminuer la luminosité</button>
      <canvas
        ref={canvasRef}
        style={{ border: "2px solid black", cursor: "crosshair" }}
        onMouseDown={startSelection}
        onMouseMove={drawSelection}
        onMouseUp={stopSelection}
      />
    </div>
  );
}

export default App;
