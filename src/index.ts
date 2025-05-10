import {
  ViewerApp,
  DiamondPlugin,
  GroundPlugin,
  DiamondMaterial,
  addBasePlugins,
  Vector3,
  WireframeGeometry2,
  LineMaterial,
  LineSegments2,
  Vector2,
  AssetImporter,
  Object3D, Wireframe, EdgesGeometry, LineSegments, LineBasicMaterial, LineGeometry, Line2
} from "webgi";
import "./styles.css";

async function setupViewer() {
  // Initialize the viewer
  const viewer = new ViewerApp({
    canvas: document.getElementById('webgi-canvas') as HTMLCanvasElement,
  });

  viewer.renderer.renderScale = Math.min(window.devicePixelRatio, 2);

  // Add diamond plugin
  await viewer.addPlugin(DiamondPlugin);

  // Add base plugins
  await addBasePlugins(viewer);

  const diamondMat = new DiamondMaterial({
    name:                        "DIA-Diamond-White-1",
    color:                       0xffffff,
    envMapIntensity:             1,
    dispersion:                  0.012,
    squashFactor:                0.98,
    geometryFactor:              0.5,
    gammaFactor:                 1,
    absorptionFactor:            1,
    reflectivity:                0.5,
    refractiveIndex:             2.6,
    rayBounces:                  5,
    diamondOrientedEnvMap:       0,
    boostFactors:                new Vector3(1, 1, 1),
    transmission:                0,
    isDiamondMaterialParameters: true,
    userData:                    {
      separateEnvMapIntensity: true,
      uuid:                    "8515627c-c6b8-45dc-bff3-161fa400b991",
      names:                   [ "White Diamond", "Diamond White", "Diamond" ]
    }
  });

  // Disable ground
  const groundPlugin = viewer.getPluginByType(GroundPlugin);
  if (groundPlugin) groundPlugin.visible = false;

  // Setup diamond plugin
  const diamondPlugin: DiamondPlugin | undefined = viewer.getPluginByType('Diamond');
  await viewer.getManager()?.importer?.importSinglePath("./GEM-immersive.hdr");
  const diamondEnvMap = await viewer.getManager()?.importer?.importSinglePath("./GEM-immersive.hdr");
  diamondPlugin.envMap = diamondEnvMap;

  const lineDiamondObject = await viewer.getManager()?.importer?.importSinglePath("./line-diamond.glb");
  // console.log("lineDiamondObject :::::::::::", lineDiamondObject)

  // Create wireframe group container
  const wireframeGroup = new Object3D();
  wireframeGroup.name = "WireframeContainer";
  // Handle diamond model load
  viewer.scene.addEventListener("addSceneObject", async ({ object }) => {
    if (!object.modelObject) return;

    // Prepare diamond mesh
    object.modelObject.traverse((model) => {
      if (model.type === 'Mesh') {
        const cacheKey = model.name.split("_")[0].split("-").splice(1, 10).join("-");
        diamondPlugin?.prepareDiamondMesh(model, { cacheKey, normalMapRes: 512 });
        model.setMaterial(diamondMat);
        model.setDirty();
      }
    });


    // Process wireframe from line diamond object
    if (lineDiamondObject && lineDiamondObject.modelObject) {
      lineDiamondObject.modelObject.traverse((lineObject) => {
        if (lineObject.type === 'Line' && lineObject.geometry) {
          console.log("Line ", lineObject);
          lineObject.scale.x = 1.01;
          lineObject.scale.y = 1.01;
          lineObject.scale.z = 1.01;
          const wireframe = createWireframeFromLineObject(lineObject);
          // wireframeGroup.add(wireframe);
          viewer.scene.addSceneObject(wireframe);
        }
      });
    }
  });
  // console.log("wireframeGroup :::::::", wireframeGroup)
  const options = {
    source:     "wireframe-group",
    autoScale:  false,
    autoCenter: true
  };
  // const lineModels = await viewer.getManager().addImported(lineDiamondObject, options);
  // viewer.scene.addSceneObject(lineModels.modelObject);

  // const wireframeModels = await viewer.getManager().addImported(wireframeGroup, options);
  // viewer.scene.addSceneObject(wireframeModels.modelObject);

  // viewer.scene.modelRoot.add(lineModels.modelObject);

  await viewer.setEnvironmentMap("./MTL-immersive.hdr");
  await viewer.load("./diamond.glb");

  // const groundPlane = viewer.scene.children.find(o => o.name === 'Ground Plane');
  // if (groundPlane) groundPlane.visible = false;

  viewer.scene.setDirty();
}

const wireframeMaterial = new LineMaterial({
  color:     0x000000,
  linewidth: 5,
  dashed:    false,
});
window.addEventListener('resize', () => {
  wireframeMaterial.resolution.set(window.innerWidth, window.innerHeight);
});

function createWireframeFromLineObject(lineObject) {

  const geometry = new LineGeometry();
  console.log(lineObject);

  geometry.setPositions([
    lineObject.userData.attributes.geometry.pointAtStart[0], lineObject.userData.attributes.geometry.pointAtStart[1], lineObject.userData.attributes.geometry.pointAtStart[2],
    lineObject.userData.attributes.geometry.pointAtEnd[0], lineObject.userData.attributes.geometry.pointAtEnd[1], lineObject.userData.attributes.geometry.pointAtEnd[2]
  ]);

  const line = new Line2(geometry, wireframeMaterial);
  line.computeLineDistances();
  line.scale.set(1, 1, 1);
  return line;

  // const wireframeGeometry = new WireframeGeometry2(lineObject.geometry);
  // const wireframe = new Wireframe(wireframeGeometry, wireframeMaterial);
  // wireframe.computeLineDistances();
  // return wireframe;

  // const Line = new EdgesGeometry(lineObject.geometry);
  // return new LineSegments(Line, wireframeMaterial);

}

setupViewer();