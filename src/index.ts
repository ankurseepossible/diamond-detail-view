import {
  ViewerApp,
  DiamondPlugin,
  GroundPlugin,
  DiamondMaterial,
  addBasePlugins,
  Vector3,
  Object3D,
  BloomPlugin,
  CameraViewPlugin,
  TemporalAAPlugin,
  TonemapPlugin,
  SphereGeometry,
  MeshBasicMaterial2,
  Mesh,
  AssetManagerPlugin,
  ICameraControls,
  PopmotionPlugin,
  Cache,
  ITexture,
  Color,
  TweakpaneUiPlugin,
  MeshBasicMaterial,
  PresetLibraryPlugin, PluginPresetGroup,
} from "webgi";
import "./styles.css";
import * as THREE from 'three';
import get = Cache.get;

// Interface for storing annotation points
interface AnnotationPoint {
  position: Vector3;
  name: string;
}

// Class to manage annotation functionality
class AnnotationManager {
  private viewer: ViewerApp;
  private isAnnotationMode: boolean = false;
  private annotationPoints: AnnotationPoint[] = [];
  private activeMarkers: THREE.Sprite[] = [];
  private markerMaterial: THREE.SpriteMaterial;

  constructor(viewer: ViewerApp) {
    this.viewer = viewer;

    // Create a sprite material for annotation markers
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = canvas.height = 64;

    if (context) {
      context.beginPath();
      context.arc(32, 32, 16, 0, 2 * Math.PI);
      context.fillStyle = 'red';
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = 'white';
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.markerMaterial = new THREE.SpriteMaterial({ map: texture });

    // Create UI components
    this.createUI();
  }

  private createUI() {
    // Create container for controls
    const container = document.createElement('div');
    container.className = 'annotation-controls';
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.zIndex = '100';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Enable Annotation Mode';
    toggleButton.style.padding = '8px 16px';
    toggleButton.style.backgroundColor = '#4CAF50';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';

    // Create export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Annotations';
    exportButton.style.padding = '8px 16px';
    exportButton.style.backgroundColor = '#2196F3';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '4px';
    exportButton.style.cursor = 'pointer';

    // Create annotation list container
    const listContainer = document.createElement('div');
    listContainer.className = 'annotation-list';
    listContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    listContainer.style.borderRadius = '4px';
    listContainer.style.padding = '10px';
    listContainer.style.maxHeight = '300px';
    listContainer.style.overflowY = 'auto';
    listContainer.style.display = 'none';

    // Add event listeners
    toggleButton.addEventListener('click', () => {
      this.isAnnotationMode = !this.isAnnotationMode;
      toggleButton.textContent = this.isAnnotationMode ? 'Disable Annotation Mode' : 'Enable Annotation Mode';
      toggleButton.style.backgroundColor = this.isAnnotationMode ? '#F44336' : '#4CAF50';

      if (this.isAnnotationMode) {
        listContainer.style.display = 'block';
      } else {
        listContainer.style.display = 'none';
      }
    });

    exportButton.addEventListener('click', () => {
      this.exportAnnotations();
    });

    // Add elements to container
    container.appendChild(toggleButton);
    container.appendChild(exportButton);
    container.appendChild(listContainer);

    // Add container to document
    document.body.appendChild(container);
  }

  public isActive(): boolean {
    return this.isAnnotationMode;
  }

  public addAnnotationPoint(position: Vector3, name: string = ""): void {
    // If no name is provided, generate one
    const pointName = name || `Point ${this.annotationPoints.length + 1}`;

    // Create the annotation point
    const point: AnnotationPoint = {
      position: position.clone(),
      name:     pointName
    };

    // Add to array
    this.annotationPoints.push(point);

    // Create visual marker
    // this.createMarker(point);

    // Update UI list
    this.updateAnnotationList();
  }


  private createMarker(point: AnnotationPoint): void {
    const sprite = new THREE.Sprite(this.markerMaterial);
    sprite.position.copy(point.position);
    sprite.scale.set(0.1, 0.1, 0.1);

    // Add to scene
    this.viewer.scene.modelRoot.modelObject.add(sprite);
    // this.activeMarkers.push(sprite);

    // Ensure the scene is updated
    this.viewer.scene.setDirty();
  }

  private updateAnnotationList(): void {
    const listContainer = document.querySelector('.annotation-list');
    if (!listContainer) return;

    // Clear current list
    listContainer.innerHTML = '';

    // Add header
    const header = document.createElement('h3');
    header.textContent = 'Annotation Points';
    header.style.margin = '0 0 10px 0';
    listContainer.appendChild(header);

    // Create list
    if (this.annotationPoints.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.textContent = 'No annotation points yet.';
      emptyText.style.fontStyle = 'italic';
      listContainer.appendChild(emptyText);
    } else {
      this.annotationPoints.forEach((point, index) => {
        const item = document.createElement('div');
        item.style.marginBottom = '5px';
        item.style.padding = '5px';
        item.style.borderBottom = '1px solid #ddd';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';

        const nameContainer = document.createElement('div');

        // Allow editing the name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = point.name;
        nameInput.style.width = '120px';
        nameInput.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          point.name = target.value;
        });

        nameContainer.appendChild(nameInput);

        const posText = document.createElement('span');
        posText.textContent = `(${point.position.x.toFixed(2)}, ${point.position.y.toFixed(2)}, ${point.position.z.toFixed(2)})`;
        posText.style.fontSize = '0.8em';
        posText.style.color = '#666';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.style.backgroundColor = '#F44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.marginLeft = '8px';

        deleteBtn.addEventListener('click', () => {
          this.removeAnnotation(index);
        });

        item.appendChild(nameContainer);
        item.appendChild(posText);
        item.appendChild(deleteBtn);
        listContainer.appendChild(item);
      });
    }
  }

  private removeAnnotation(index: number): void {
    if (index >= 0 && index < this.annotationPoints.length) {
      // Remove from array
      this.annotationPoints.splice(index, 1);

      // Remove visual marker
      if (index < this.activeMarkers.length) {
        const marker = this.activeMarkers[index];
        this.viewer.scene.modelRoot.modelObject.remove(marker);
        this.activeMarkers.splice(index, 1);
      }

      // Update UI
      this.updateAnnotationList();
      this.viewer.scene.setDirty();
    }
  }

  private exportAnnotations(): void {
    // Create JSON data
    const data = {
      annotationPoints: this.annotationPoints.map(point => ({
        name:     point.name,
        position: {
          x: point.position.x,
          y: point.position.y,
          z: point.position.z
        }
      }))
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(data, null, 2);

    // Create download link
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "annotation_points.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
}

const stories = [
  {
    "name":     "TABLE",
    "key":      "tableView",
    "position": {
      "x": 0.6366669121084445,
      "y": 0.49289765997548174,
      "z": -0.4171726540280889
    }
  },
  {
    "name":     "RATIO",
    "key":      "ratioView",
    "position": {
      "x": -0.6035071757341377,
      "y": 0.5337213813490522,
      "z": -0.03671880897078171
    }
  },
  {
    "name":     "GIRDLE",
    "key":      "girdleView",
    "position": {
      "x": 0.15862029218881576,
      "y": 0.2175973121474169,
      "z": 1.22475253893591
    }
  },
  {
    "name":     "CROWN FACET",
    "key":      "crownFacetView",
    "position": {
      "x": -0.4,
      "y": 0.1,
      "z": -1.2713988016024989
    }
  },
  {
    "name":     "CROWN HEIGHT",
    "key":      "crownHeightView",
    "position": {
      "x": 0.07933897335510723,
      "y": 0.44066156403552537,
      "z": 1.165096879999456
    }
  },
  {
    "name":     "DEPTH",
    "key":      "depthView",
    "position": {
      "x": 0.8067551705921767,
      "y": 0.012943025771035205,
      "z": -0.2629719383832498
    }
  },
  {
    "name":     "PAVILION HEIGHT",
    "key":      "pavilionHeightView",
    "position": {
      "x": 0.10948382249209307,
      "y": -0.11487387091374723,
      "z": 1.038663210543583
    }
  },
  {
    "name":     "PAVILION FACET",
    "key":      "pavilionFacetView",
    "position": {
      "x": -0.4104071059634021,
      "y": -0.5552740884106853,
      "z": 0.14552876855195696
    }
  }
]

async function addPlugins(viewer: ViewerApp) {

  if (false) {
    // For Debugging objects by picking it.
    const tweakPaneUI = await viewer.addPlugin(TweakpaneUiPlugin);

    tweakPaneUI.setupPluginUi(TonemapPlugin);
    tweakPaneUI.setupPluginUi(DiamondPlugin);
    tweakPaneUI.setupPluginUi(TemporalAAPlugin);
    tweakPaneUI.setupPluginUi(GroundPlugin);
    tweakPaneUI.setupPluginUi(CameraViewPlugin);
    tweakPaneUI.setupPluginUi(BloomPlugin);
  }
  // For Camera animation
  await viewer.addPlugin(PopmotionPlugin);

  return true;
}

async function setEnvironment(viewer: ViewerApp) {
  const manager = viewer.getPlugin(AssetManagerPlugin);
  await manager!.addFromPath(`./default.json`);
}

const canvas = document.getElementById("immersive-canvas");
const annotationToggleContainer = document.querySelector('.annotation-toggle');
const LineStandardMaterial = new MeshBasicMaterial();
const disableLineStandardMaterial = new MeshBasicMaterial();

async function setupViewer() {
  const viewer = new ViewerApp({
    canvas: document.getElementById("immersive-canvas") as HTMLCanvasElement,
  });
  await addBasePlugins(viewer);
  const presetLibraryPlugin = viewer.getPlugin(PresetLibraryPlugin);
  presetLibraryPlugin?.presetGroups?.push(new PluginPresetGroup(BloomPlugin.PluginType));
  presetLibraryPlugin?.presetGroups?.push(new PluginPresetGroup(TonemapPlugin.PluginType));
  // await setEnvironment(viewer);
  await addPlugins(viewer);


  const diamondMat = new DiamondMaterial({
    name:                        "DIA-Diamond-White-1",
    color:                       0xffffff,
    envMapIntensity:             1.55,
    dispersion:                  0.01,
    squashFactor:                0.98,
    geometryFactor:              0.5,
    gammaFactor:                 1,
    absorptionFactor:            0,
    reflectivity:                0.5,
    refractiveIndex:             2.4,
    rayBounces:                  5,
    diamondOrientedEnvMap:       0,
    boostFactors:                new Vector3(1, 1, 1),
    transmission:                0,
    isDiamondMaterialParameters: true,
    userData:                    {
      separateEnvMapIntensity: true,
      uuid:                    "8515627c-c6b8-45dc-bff3-161fa400b991",
      names:                   [ "White Diamond", "Diamond White", "Diamond" ],
    },
  });
  const lineObjects = [];

  function updateLineVisibility(isVisible) {
    lineObjects.forEach(lineObj => {
      lineObj.visible = isVisible;
      lineObj.setDirty();
    });
    viewer.scene.setDirty();
  }

  const normalViewDistance = { min: 150, max: 300 };
  const cameraOptions = viewer.scene.activeCamera.getCameraOptions();
  cameraOptions.fov = 1;
  const CamControls: ICameraControls | undefined = viewer.scene.activeCamera.controls;
  CamControls!.enablePan = false;
  CamControls!.minDistance = normalViewDistance.min;
  CamControls!.maxDistance = normalViewDistance.max;
  viewer.scene.activeCamera.setCameraOptions(cameraOptions);
  CamControls!.minPolarAngle = 0;
  CamControls!.maxPolarAngle = Math.PI;


  const groundPlugin = viewer?.getPlugin(GroundPlugin);
  groundPlugin.enabled = false;

  const DiaManager = viewer.getPlugin(AssetManagerPlugin);
  const diamondEnvMap: ITexture | undefined = await DiaManager!.importer!.importSinglePath<ITexture>("./env_gem.exr");
  const diamondPlugin: DiamondPlugin | undefined = viewer.getPluginByType('Diamond');
  // @ts-ignore
  diamondPlugin!.envMap = diamondEnvMap;
  diamondPlugin!.envMapRotation = 3.3;
  viewer.renderer.refreshPipeline();

  viewer.scene.addEventListener("addSceneObject", async ({ object }) => {
    if (!object.modelObject) return;
    object.modelObject.traverse((model) => {
      if (model.name.includes("gem") && model.type === "Mesh") {
        const cacheKey = model.name
          .split("_")[0]
          .split("-")
          .splice(1, 10)
          .join("-");
        diamondPlugin?.prepareDiamondMesh(model, {
          cacheKey,
          normalMapRes: 1024,
        });
        model.setMaterial(diamondMat);
        model.setDirty();
      } else if (model.name.includes("line")) {
        model.material = LineStandardMaterial;
        model.setDirty();
        lineObjects.push(model);
      } else if (model.type === "Mesh") {
        model.visible = false;
      }
    });
  });

  // const { focusCameraView, autoRotateEvent } = await bindActionButtonEvents(viewer);

  let rotationSwitchState = true;
  let annotationsEnabled = true;
  const cameraControls = viewer.scene.activeCamera.controls;

  function updateRotation() {
    cameraControls!.autoRotate = !annotationsEnabled && rotationSwitchState;
  }

  window.addEventListener("rotationSwitch", (event) => {
    rotationSwitchState = event.detail.enabled;
    updateRotation();
  });

  window.addEventListener('annotationToggle', async (event) => {
    annotationsEnabled = event.detail.enabled;

    updateLineVisibility(annotationsEnabled);

    if (!annotationsEnabled) {
      hideOtherAnnotations();
    } else {
      showAllAnnotations();
    }

    updateRotation();
  });

  const cameraViewPlugin = viewer.getPlugin(CameraViewPlugin);
  const closeButton = document.querySelector('.close-button');
  const { focusCameraView } = await bindActionButtonEvents(viewer);
  closeButton!.addEventListener('click', () => {
    window.parent.postMessage({
      action: 'DIA_CLICK_CLOSE_BTN',
    }, '*')

    const cameraControls = viewer.scene.activeCamera.controls;
    setTimeout(() => {
      if (cameraControls) {
        cameraControls.enabled = false;
        cameraControls.autoRotate = false;
      }
      viewer.scene.setDirty();
    }, 1100);

    setTimeout(() => {
      const initialView = cameraViewPlugin!.camViews.find(view => view.name === 'initialView');
      focusCameraView(initialView);
    }, 100);
    const actualAnimationDuration = cameraViewPlugin?.animDuration || 1000;
    const toggleSwitch = document.getElementById('annotationToggle');
    const rotationToggleSwitch = document.getElementById('rotationSwitch');
    if (annotationToggleContainer) {
      annotationToggleContainer.style.display = 'flex';
    }
    setTimeout(() => {
      if (toggleSwitch?.classList.contains('active')) {
        showAllAnnotations();
        window.parent.postMessage({
          action: 'DIA_ANNOTATION_LOADED',
        }, '*')
      } else {
        updateLineVisibility(false);
        if (rotationToggleSwitch?.classList.contains('active')) {
          setTimeout(() => {
            if (cameraControls) {
              cameraControls.enabled = true;
              cameraControls.autoRotate = true;
            }
            viewer.scene.setDirty();
          }, 100);
        }
        return;
      }
    }, actualAnimationDuration)
    closeButton!.style.display = 'none';
    canvas!.style.pointerEvents = 'auto';

    viewer.scene.modelRoot.traverse((object: Object3D) => {
      object.modelObject.traverse((model: Object3D) => {
        if (model.type === "Mesh") {
          if (model.name.includes('gem')) {
            return; // Keep gems visible
          }
          if (model.name.includes("line") && toggleSwitch?.classList.contains('active')) {
            model.material = LineStandardMaterial;
            model.visible = true;
          } else {
            model.visible = false;
          }
        }
      });
    });
    viewer.scene.setDirty();
  });

  viewer.scene.setDirty();
  bindIFrameEvents(viewer);
}

async function getSphereObject(viewer: ViewerApp): Promise<any> {
  const geometry = new SphereGeometry(0.005);
  geometry.name = 'pointSphereGeo';
  const basicMaterial = new MeshBasicMaterial2({ color: 0x049EF4 });
  const sphere = new Mesh(geometry, basicMaterial);
  sphere.name = 'pointSphereMesh';
  const sphereObject = await viewer.createObject3D(sphere);
  sphereObject!.visible = false;
  return sphere;
}

const annotationItems: { model: Object3D; annotationElement: Element; }[] = [];

async function showAnnotationDetail(viewer: ViewerApp, target: any, focusView: any) {

  canvas!.style.pointerEvents = 'none';
  const cameraViewPlugin = viewer.getPlugin(CameraViewPlugin);
  const closeButton = document.querySelector('.close-button');

  setTimeout(() => {
    const cameraControls = viewer.scene.activeCamera.controls;
    cameraControls!.autoRotate = false;
    viewer.scene.setDirty()
  }, 100)
  const targetViewName = cameraViewPlugin!.camViews.find(view => view.name === target);
  hideOtherAnnotations();

  viewer.scene.modelRoot.traverse(async (object: Object3D) => {
    closeButton!.style.display = 'none';
    object.modelObject.traverse((model: Object3D) => {
      if (model.type === "Mesh") {
        if (model.name.includes('gem')) {
          return;
        }
        if (!model.name.includes(target)) {
          model.visible = false;
        }
      }
    });
  });

  setTimeout(() => {
    focusView(targetViewName);
  }, 800)

  const cameraPlugin = viewer.getPlugin(CameraViewPlugin);
  const actualAnimationDuration = cameraPlugin?.animDuration || 1000;

  viewer.scene.modelRoot.traverse(async (object: Object3D) => {
    const targetViewNameStr = target;

    setTimeout(() => {
      closeButton!.style.display = 'block';
      object.modelObject.traverse((model: Object3D) => {
        if (model.type === "Mesh") {
          if (model.name.includes('gem')) {
            return;
          }

          const isFacetView = targetViewNameStr === "pavilionFacetView" || targetViewNameStr === "crownFacetView";

          if (model.name.includes(targetViewNameStr)) {
            model.material = LineStandardMaterial;
            model.visible = true;
          } else if (isFacetView && model.name.includes("line")) {
            model.material = LineStandardMaterial;
            model.visible = true;
          } else if (model.name.includes("line")) {
            model.material = disableLineStandardMaterial;
            model.visible = true;
          } else {
            model.visible = false;
          }
        }
      });

      const cameraControls = viewer.scene.activeCamera.controls;
      if (cameraControls) {
        cameraControls.enabled = false;
      }
      viewer.scene.setDirty();
    }, actualAnimationDuration + 1000);
  });
}

async function createStoryPoint(viewer: ViewerApp, newSphere: any, point: any, story = {}, focusView: any, annotationIsEnable: boolean = true) {
  viewer.scene.addSceneObject(newSphere);
  newSphere.position.set(point.x, point.y, point.z);
  viewer.scene.setDirty();

  const annotationElement = getNewAnnotation(newSphere.uuid, story);
  const annotationToggleContainer = document.querySelector('.annotation-toggle');

  // @ts-ignore
  annotationElement?.querySelector('.annotation-content').addEventListener('click', async (evt: MouseEvent) => {
    if (annotationToggleContainer) {
      annotationToggleContainer.style.display = 'none';
    }

    let target = evt.target;
    if (!evt.target?.dataset?.viewname) {
      for (let elem of evt.path) {
        if (elem?.dataset?.viewname) {
          target = elem;
          break;
        }
      }
    }
    window.parent.postMessage({
      action: 'DIA_VIEW',
      view:   target?.dataset.viewname,
    }, '*')
    await showAnnotationDetail(viewer, target?.dataset.viewname, focusView)
  });

  const annotationContainer = document.querySelector('.annotation-container');
  if (annotationContainer && annotationElement) {
    annotationContainer.appendChild(annotationElement);
    updateNewStoryScreenPosition(viewer, annotationElement, point);
    annotationItems.push({ model: newSphere, annotationElement });
    viewer.addEventListener("postRender", () => {
      updateNewStoryScreenPosition(viewer, annotationElement, point);
    });
  }
}

// Functions to hide/show annotation labels
function hideOtherAnnotations() {
  const allAnnotations = document.querySelectorAll('.annotation-container .annotation');
  // @ts-ignore
  allAnnotations.forEach((annotation: HTMLElement) => {
    annotation.style.display = 'none';
    // Also hide the corresponding 3D sphere
    const sphereId = annotation.id;
    const correspondingSphere = annotationItems.find(item => item.annotationElement.id === sphereId);
    if (correspondingSphere) {
      correspondingSphere.model.visible = false;
    }
  });
}

function showAllAnnotations() {
  const allAnnotations = document.querySelectorAll('.annotation-container .annotation');
  // @ts-ignore
  allAnnotations.forEach((annotation: HTMLElement) => {
    annotation.style.display = 'block';
    const sphereId = annotation.id;
    const correspondingSphere = annotationItems.find(item => item.annotationElement.id === sphereId);
    if (correspondingSphere) {
      correspondingSphere.model.visible = true;
    }
  });
}

let timeOutNewStory: number | undefined;

function updateNewStoryScreenPosition(viewer: ViewerApp, annotationElement: HTMLElement, point: Vector3) {
  const camera = viewer!.scene.activeCamera.cameraObject;
  const vector = point.clone();
  vector.project(camera);
  vector.x = Math.round((0.5 + vector.x / 2) * (viewer!.canvas.width / viewer!.renderer.displayCanvasScaling));
  vector.y = Math.round((0.5 - vector.y / 2) * (viewer!.canvas.height / viewer!.renderer.displayCanvasScaling));

  // annotationElement.style.opacity =
  annotationElement.style.top = `${vector.y}px`;
  annotationElement.style.left = `${vector.x}px`;
  if (timeOutNewStory) {
    clearTimeout(timeOutNewStory);
  }
}

function getNewAnnotation(id: number | string, story = {}) {
  // @ts-ignore
  const annotationDraft: HTMLElement = document.querySelector('.annotation.draft');
  // console.log("annotationDraft", annotationDraft);
  if (!annotationDraft) {
    return;
  }
  // @ts-ignore
  let annotationElement: HTMLElement = annotationDraft!.cloneNode(true);
  // console.log("annotationElement", annotationElement);

  if (!annotationElement) {
    return;
  }

  // @ts-ignore
  annotationElement.id = id;
  annotationElement.classList.add(`item-${id}`);
  annotationElement.classList.remove('hide');
  annotationElement.classList.remove('draft');
  annotationElement.style.opacity = '1';

  annotationElement.dataset.viewname = story.key;

  if ('name' in story) {
    // @ts-ignore
    annotationElement.querySelector('.name').innerHTML = story.name;
  }

  return annotationElement;
}

async function animateObject(viewer: ViewerApp, popMotion: PopmotionPlugin, object: Object3D, targetPosition: Vector3, animationEase: string = EasingFunctions.circOut, duration: number = 2000) {
  for (let axis in targetPosition) {
    // @ts-ignore
    if (object.rotation[axis] != targetPosition[axis]) {
      popMotion.animate({
        // @ts-ignore
        from: object.rotation[axis],
        // @ts-ignore
        to: targetPosition[axis],
        duration,
        // @ts-ignore
        ease:     EasingFunctions[animationEase],
        onUpdate: (n: number) => {
          // @ts-ignore
          object.rotation[axis] = n;
          // @ts-ignore
          object.setDirty();
        }
      });
    }
  }
}

async function bindActionButtonEvents(viewer: ViewerApp) {
  let cameraViewPlugin = viewer.getPlugin(CameraViewPlugin);
  let autoRotateBtn = document.querySelector('.auto-rotate-btn');

  function autoRotateEvent(evt: any) {
    const cameraControls: ICameraControls = viewer.scene.activeCamera.controls;
    if (cameraControls) {
      cameraControls.autoRotate = !cameraControls.autoRotate;
      if (cameraControls.autoRotate) {
        evt?.target?.classList.add('rotate-y');
      } else {
        evt?.target?.classList.remove('rotate-y');
      }
    }
  }

  autoRotateBtn?.addEventListener('click', autoRotateEvent);

  async function focusCameraView(viewToFocus: any) {
    if (!viewToFocus) {
      return;
    }
    viewToFocus?.focusView();
    viewer.scene.modelObject.traverse((model) => {
      if (model.type === 'Object3D' && model.name && model.userData.name) {
        rootModel = model;
        return false;
      }
    });
    if (viewToFocus?.userData?.rotation) {
      await animateObject(viewer, popmotion, rootModel, viewToFocus.userData.rotation, cameraViewPlugin!.animEase, cameraViewPlugin!.animDuration);
    }
  }

  let rootModel: Object3D;
  const popmotion = await viewer.getPlugin(PopmotionPlugin);

  return {
    autoRotateEvent: autoRotateEvent,
    focusCameraView: focusCameraView
  };
}

// console.log(story);
setupViewer();

// path object polyfills for mouse events.
if (!("path" in MouseEvent.prototype)) {
  Object.defineProperty(MouseEvent.prototype, "path", {
    get: function () {
      var path = [];
      var currentElem = this.target;
      while (currentElem) {
        path.push(currentElem);
        currentElem = currentElem.parentElement;
      }
      if (path.indexOf(window) === -1 && path.indexOf(document) === -1)
        path.push(document);
      if (path.indexOf(window) === -1)
        path.push(window);
      return path;
    }
  });
}
if (!("path" in PointerEvent.prototype)) {
  Object.defineProperty(PointerEvent.prototype, "path", {
    get: function () {
      var path = [];
      var currentElem = this.target;
      while (currentElem) {
        path.push(currentElem);
        currentElem = currentElem.parentElement;
      }
      if (path.indexOf(window) === -1 && path.indexOf(document) === -1)
        path.push(document);
      if (path.indexOf(window) === -1)
        path.push(window);
      return path;
    }
  });
}

function bindIFrameEvents(viewer: ViewerApp) {
  window.addEventListener('message', async (event) => {
    let eventData: any = event.data;
    console.log("Received event data", eventData);
    switch (eventData?.action) {
      case 'DIA_LOAD_DESIGN':
        LineStandardMaterial.color = new Color(eventData.activeLineColor);
        disableLineStandardMaterial.color = new Color(eventData.deactivatedLineColor);
        switch (eventData.shape) {
          case 'EMR' :
            await viewer.load("EMR-R0.glb");
            break;
          case 'RND':
            await viewer.load("RND-R0.glb");
            break;
          case 'OVA':
            await viewer.load("OVA-R0.glb");
            break;
          case 'PEA':
            await viewer.load("PEA-R0.glb");
            break;
          case 'MAR':
            await viewer.load("MAR-R0.glb");
            break;
          case 'RAD':
            await viewer.load("RAD-R0.glb");
            break;
          case 'PRC':
            await viewer.load("PRC-R0.glb");
            break;
          case 'HRT':
            await viewer.load("HRT-R0.glb");
            break;
          case 'CUS':
            await viewer.load("CUS-R0.glb");
            break;
          case 'ASC':
            await viewer.load("ASC-R0.glb");
            break;
          default:
            return;
        }
        const manager = viewer.getPlugin(AssetManagerPlugin);
        await manager!.addFromPath(`CameraViews.json?v=1`);
        const { focusCameraView, autoRotateEvent } = await bindActionButtonEvents(viewer);
        const cameraViewPlugin = viewer.getPlugin(CameraViewPlugin);
        await focusCameraView(cameraViewPlugin!.camViews.find(view => view.name === 'initialView'));
        viewer.scene.backgroundColor = eventData.canvasBackgroundColor;
        const sphere = await getSphereObject(viewer);
        stories.forEach(story => {
          const newSphere = sphere.clone();
          const position = new Vector3(story.position.x, story.position.y, story.position.z);
          createStoryPoint(viewer, newSphere, position, story, focusCameraView)
        });
        const cameraPlugin = viewer.getPlugin(CameraViewPlugin);
        const actualAnimationDuration = cameraPlugin?.animDuration || 1000;
        setTimeout(() => {
          if (annotationToggleContainer) {
            annotationToggleContainer.style.display = 'flex';
            if(eventData.annotationFontFamily) document.querySelectorAll('.toggle-label').forEach(toggle => {
              toggle.style.fontFamily = eventData.annotationFontFamily;
            })
            document.querySelectorAll('.toggle-switch').forEach(toggle => {
              toggle.style.backgroundColor = eventData.annotationColor;
              toggle.addEventListener('click', () => {
                if (toggle.classList.contains('active')) {
                  toggle.style.backgroundColor = eventData.annotationColor; // active color
                } else {
                  toggle.style.backgroundColor = '#ccc'; // default color
                }
              });
            });
          }
          window.parent.postMessage({
            action: 'DIA_DESIGN_LOADED',
          }, '*')
        }, actualAnimationDuration);
        break;

      case 'DIA_CHANGE_VIEW':
        if (eventData.view) {
          if (annotationToggleContainer) {
            annotationToggleContainer.style.display = 'none';
          }
          canvas!.style.pointerEvents = 'none';
          const { focusCameraView } = await bindActionButtonEvents(viewer);
          hideOtherAnnotations();
          await showAnnotationDetail(viewer, eventData.view, focusCameraView);
        }
        break;
      default:
    }
  });

  window.parent.postMessage({
    action: 'DIA_HANDSHAKE',
    from:   'Child'
  }, '*');
}