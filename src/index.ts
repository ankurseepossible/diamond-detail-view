import {
  addBasePlugins,
  DiamondMaterial,
  DiamondPlugin,
  GroundPlugin, IMaterial,
  ITexture,
  Line,
  Line2,
  LineGeometry,
  LineMaterial,
  LineSegments,
  LineSegments2,
  LineSegmentsGeometry,
  Object3D,
  Vector3,
  ViewerApp,
} from "webgi";
import "./styles.css";

async function setupViewer() {
  // Initialize the viewer
  const viewer = new ViewerApp({
    canvas: document.getElementById("webgi-canvas") as HTMLCanvasElement,
    useRgbm: false,
  });

  viewer.renderer.renderScale = Math.min(window.devicePixelRatio, 2);


  // Add base plugins
  await addBasePlugins(viewer);
  // Add diamond plugin
  await viewer.addPlugin(DiamondPlugin);

  const diamondMat = new DiamondMaterial({
    name: "DIA-Diamond-White-1",
    color: 0xffffff,
    envMapIntensity: 1,
    dispersion: 0.012,
    squashFactor: 0.98,
    geometryFactor: 0.5,
    gammaFactor: 1,
    absorptionFactor: 1,
    reflectivity: 0.5,
    refractiveIndex: 2.6,
    rayBounces: 5,
    diamondOrientedEnvMap: 0,
    boostFactors: new Vector3(1, 1, 1),
    transmission: 0,
    isDiamondMaterialParameters: true,
    userData: {
      separateEnvMapIntensity: true,
      uuid: "8515627c-c6b8-45dc-bff3-161fa400b991",
      names: ["White Diamond", "Diamond White", "Diamond"],
    },
  });

  // Disable ground
  const groundPlugin = viewer.getPlugin(GroundPlugin);
  if (groundPlugin) groundPlugin.visible = false;

  // Setup diamond plugin
  const diamondPlugin: DiamondPlugin | undefined =
    viewer.getPluginByType("Diamond");
  await viewer.getManager()?.importer?.importSinglePath("./GEM-immersive.hdr");
  const diamondEnvMap = await viewer.load<ITexture>("./GEM-immersive.hdr");
  diamondPlugin.envMap = diamondEnvMap;

  // Create wireframe group container
  const wireframeGroup = new Object3D();
  wireframeGroup.name = "WireframeContainer";

  const lineDiamondObject = await viewer.load("./line-diamond.glb");
  // Process wireframe from line diamond object

  let lines: Line[] = []
  let lineSeg: LineSegments[] = []
  if (lineDiamondObject && lineDiamondObject.modelObject) {
    lineDiamondObject.modelObject.traverse((lineObject: Line) => {
      if (lineObject.type === "Line" && lineObject.geometry) {
        lines.push(lineObject);
      }
      if (lineObject.type === "LineSegments" && lineObject.geometry) {
        lineSeg.push(lineObject);
      }
    });
  }
  for (const lineObject of lines) {
    console.log("Line ", lineObject);
    const geom = new LineGeometry()
    geom.setPositions(lineObject.geometry.attributes.position.array as any)
    const line = new Line2(geom, wireframeMaterial)
    line.position.copy(lineObject.position)
    line.scale.copy(lineObject.scale)
    line.quaternion.copy(lineObject.quaternion)
    line.updateMatrixWorld(true)
    line.computeLineDistances()
    if(lineObject.parent) lineObject.parent.add(line);
    else console.error('no parent')
    lineObject.removeFromParent()
    console.log(line)
  }
  for (const lineObject of lineSeg) {
    console.log("Line ", lineObject);
    const geom = new LineSegmentsGeometry()
    geom.setPositions(lineObject.geometry.attributes.position.array as any)
    const line = new LineSegments2(geom, wireframeMaterial)
    line.position.copy(lineObject.position)
    line.scale.copy(lineObject.scale)
    line.quaternion.copy(lineObject.quaternion)
    line.updateMatrixWorld(true)
    line.computeLineDistances()
    if(lineObject.parent) lineObject.parent.add(line);
    else console.error('no parent')
    lineObject.removeFromParent()
    console.log(line)
  }

  // console.log("lineDiamondObject :::::::::::", lineDiamondObject)

  // Handle diamond model load
  viewer.scene.addEventListener("addSceneObject", async ({ object }) => {
    if (!object.modelObject) return;

    // Prepare diamond mesh
    object.modelObject.traverse((model) => {
      if (model.type === "Mesh") {
        const cacheKey = model.name
          .split("_")[0]
          .split("-")
          .splice(1, 10)
          .join("-");
        diamondPlugin?.prepareDiamondMesh(model, {
          cacheKey,
          normalMapRes: 512,
        });
        model.setMaterial(diamondMat);
        model.setDirty();
      }
    });

  });

  await viewer.setEnvironmentMap("./MTL-immersive.hdr");
  await viewer.load("./diamond.glb");

  viewer.scene.setDirty();
}

const wireframeMaterial = new LineMaterial({
  color: '#ff2222' as any, //transparent: true, opacity: 0.9,
  linewidth: 0.007, // in pixels
  // resolution: new Vector2(1024, 1024), // to be set by renderer, eventually
  dashed: false,
  toneMapped: false,
}) as LineMaterial & IMaterial
wireframeMaterial.materialObject = wireframeMaterial
wireframeMaterial.assetType = 'material'

setupViewer();
