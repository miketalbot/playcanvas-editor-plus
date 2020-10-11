import debounce from 'lodash/debounce'


var app = editor.call('viewport:app')
var device = app.graphicsDevice
var renderer = app.renderer
var scene = editor.call('preview:scene')

var pitch = -15
var yaw = 45

var white = new pc.Color(1, 1, 1, 1)
// material
var standardMaterial = new pc.StandardMaterial()
standardMaterial.useSkybox = false
standardMaterial._scene = scene

var mapping = editor.call('assets:material:mapping')
var mappingShading = {
    'phong': 0,
    'blinn': 1
}
var cubemapPrefiltered = [
    'prefilteredCubeMap128',
    'prefilteredCubeMap64',
    'prefilteredCubeMap32',
    'prefilteredCubeMap16',
    'prefilteredCubeMap8',
    'prefilteredCubeMap4'
]

function awaitAsset(id) {
    return new Promise(resolve => {
        let asset = pc.app.assets.get(id)
        if (asset) {
            asset.ready(resolve)
        } else {
            resolve()
        }
    })
}

var aabb = new pc.BoundingBox()

// model
var modelNode = new pc.GraphNode()

var meshSphere = pc.createSphere(device, {
    radius: 0,
    latitudeBands: 2,
    longitudeBands: 2
})

var modelPlaceholder = new pc.Model()
modelPlaceholder.node = modelNode
modelPlaceholder.meshInstances = [new pc.MeshInstance(modelNode, meshSphere, standardMaterial)]


// light
var lightNode = new pc.GraphNode()
lightNode.setLocalEulerAngles(45, 135, 0)

var light = new pc.Light()
light.enabled = true
light.type = pc.LIGHTTYPE_DIRECTIONAL
light.intensity = 2
light._node = lightNode

var materialLookup = {}

// camera
var cameraOrigin = new pc.GraphNode()

var cameraNode = new pc.GraphNode()
cameraNode.setLocalPosition(0, 0, 1.35)
cameraOrigin.addChild(cameraNode)

var camera = new pc.Camera()
camera._node = cameraNode
camera.nearClip = 0.01
camera.farClip = 32
camera.clearColor = [41 / 255, 53 / 255, 56 / 255, 0.0]
camera.frustumCulling = false

const handler = new pc.MaterialHandler(app)

async function prepMaterial(id) {
    if (materialLookup[id]) return materialLookup[id]
    let asset = editor.call('assets:get', id)
    if (!asset) return standardMaterial
    var data = asset.get('data')
    if (!data) return standardMaterial
    let material = handler.open('', data)
    material.update()
    materialLookup[id] = material
    return material
}

function getMaterialSync(id) {
    if (materialLookup[id]) return materialLookup[id]
    let asset = editor.call('assets:get', id)
    if (!asset) return standardMaterial
    var data = asset.get('data')
    if (!data) return standardMaterial
    let material = new pc.StandardMaterial()
    // update material
    for (var key in mapping) {
        var value = data.hasOwnProperty(key) ? data[key] : mapping[key].default


        switch (mapping[key].type) {
            case 'boolean':
            case 'string':
            case 'int':
            case 'float':
            case 'number':
                material[key] = value
                break
            case 'vec2':
                material[key].set(value[0], value[1])
                break
            case 'rgb':
            case 'vec3':
                material[key].set(value[0], value[1], value[2])
                break
            case 'cubemap':
                if (value) {
                    // TODO
                    // handle async
                    var textureAsset = app.assets.get(value)
                    if (textureAsset) {
                        if (textureAsset.resource) {
                            material[key] = textureAsset.resource
                        } else {
                            material[key] = null
                        }

                        if (textureAsset.file && textureAsset.resources && textureAsset.resources.length === 7) {
                            for (var i = 0; i < 6; i++)
                                material[cubemapPrefiltered[i]] = textureAsset.resources[i + 1]
                        } else {
                            for (var i = 0; i < 6; i++)
                                material[cubemapPrefiltered[i]] = null
                        }

                        textureAsset.loadFaces = true
                        app.assets.load(textureAsset)
                    } else {
                        material[key] = null
                        for (var i = 0; i < 6; i++)
                            material[cubemapPrefiltered[i]] = null
                    }
                } else {
                    material[key] = null
                    for (var i = 0; i < 6; i++)
                        material[cubemapPrefiltered[i]] = null
                }
                break
            case 'texture':
                if (value) {
                    // TODO
                    // handle async
                    var textureAsset = app.assets.get(value)
                    if (textureAsset) {
                        if (textureAsset.resource) {
                            material[key] = textureAsset.resource
                        } else {
                            app.assets.load(textureAsset)
                            material[key] = null
                        }
                    } else {
                        material[key] = null
                    }
                } else {
                    material[key] = null
                }
                break
            case 'object':
                switch (key) {
                    case 'cubeMapProjectionBox':
                        if (value) {
                            if (material.cubeMapProjectionBox) {
                                material.cubeMapProjectionBox.center.set(0, 0, 0)
                                material.cubeMapProjectionBox.halfExtents.set(value.halfExtents[0], value.halfExtents[1], value.halfExtents[2])
                            } else {
                                material.cubeMapProjectionBox = new pc.BoundingBox(new pc.Vec3(0, 0, 0), new pc.Vec3(value.halfExtents[0], value.halfExtents[1], value.halfExtents[2]))
                            }
                        } else {
                            material.cubeMapProjectionBox = null
                        }
                        break
                }
                break
        }
    }

    material.shadingModel = mappingShading[data.shader]
    material.update()
    materialLookup[id] = material
    return material
}

let redoQueue = new Set

function isLoaded(id) {
    return !!materialLookup[id]
}

const ModelThumbnailRenderer = (() => {

    const scene = {
        scene: null,
        cameraEntity: null,
        lightEntity: null,
        previewRoot: null,
        layerComposition: null,
        layer: null
    }

    let sceneInitialized = false

    function initializeScene() {
        const app = pc.Application.getApplication();

        // material
        scene.material = new pc.StandardMaterial();
        scene.material.useSkybox = false;
        scene.material.useFog = false;

        scene.aabb = new pc.BoundingBox();

        // model
        const modelNode = new pc.GraphNode();

        const meshSphere = pc.createSphere(app.graphicsDevice, {
            radius: 0,
            latitudeBands: 2,
            longitudeBands: 2
        });

        scene.modelPlaceholder = new pc.Model();
        scene.modelPlaceholder.node = modelNode;
        scene.modelPlaceholder.meshInstances = [new pc.MeshInstance(modelNode, meshSphere, scene.material)];

        // light
        scene.lightEntity = new pc.Entity();
        scene.lightEntity.addComponent('light', {
            type: 'directional',
            layers: []
        });
        scene.lightEntity.setLocalEulerAngles(45, 135, 0);


        // camera
        scene.cameraOrigin = new pc.Entity();

        scene.cameraEntity = new pc.Entity();
        scene.cameraEntity.addComponent('camera', {
            nearClip: 0.01,
            farClip: 32,
            clearColor: new pc.Color(41 / 255, 53 / 255, 56 / 255, 0.0),
            frustumCulling: false,
            layers: []
        });
        scene.cameraEntity.setLocalPosition(0, 0, 1.35);
        scene.cameraOrigin.addChild(scene.cameraEntity);

        // All preview objects live under this root
        scene.previewRoot = new pc.Entity();
        scene.previewRoot._enabledInHierarchy = true;
        scene.previewRoot.enabled = true;
        scene.previewRoot.addChild(modelNode);
        scene.previewRoot.addChild(scene.lightEntity);
        scene.previewRoot.addChild(scene.cameraOrigin);
        scene.previewRoot.syncHierarchy();
        scene.previewRoot.enabled = false;

        sceneInitialized = true;
    }

    class ModelThumbnailRenderer {

        constructor(asset, canvas) {
            this._asset = asset
            this._canvas = canvas

            this._queueRenderHandler = this.queueRender.bind(this)

            this._watch = editor.call('assets:model:watch', {
                asset: asset,
                autoLoad: true,
                callback: this._queueRenderHandler
            })

            this._rotationX = -45
            this._rotationY = 45

            this._queuedRender = false

            this._frameRequest = null
        }

        queueRender() {
            if (this._queuedRender) return
            this._queuedRender = true
            this._frameRequest = requestAnimationFrame(() => {
                this.render(this._rotationX, this._rotationY)
            })
        }

        render(rotationX = -15, rotationY = 45) {
            this._queuedRender = false
            const data = this._asset.get('data')
            if (!data) return

            const app = pc.Application.getApplication()
            const modelAsset = app.assets.get(this._asset.get('id'))
            if (!modelAsset) return
            const materials = []
            for (let i = 0; i < data.mapping.length; i++) {
                let material
                if (!isLoaded(data.mapping[i].material)) {
                    redoQueue.add({asset: this._asset, render: this.queueRender.bind(this)})
                    redo()
                    material = standardMaterial
                    materials.push(material)
                    break
                } else {
                    material = getMaterialSync(data.mapping[i].material)
                }

                materials.push(material)
            }
            if (!materials.length) return

            if (!sceneInitialized) {
                initializeScene()
            }

            this._rotationX = rotationX
            this._rotationY = rotationY

            const layerComposition = pcui.ThumbnailRendererUtils.layerComposition
            const layer = pcui.ThumbnailRendererUtils.layer

            let width = this._canvas.width
            let height = this._canvas.height

            if (width > height) {
                width = height
            } else {
                height = width
            }

            const rt = pcui.ThumbnailRendererUtils.getRenderTarget(app, width, height)

            scene.previewRoot.enabled = true

            scene.cameraEntity.camera.aspectRatio = height / width
            layer.renderTarget = rt

            let model = scene.modelPlaceholder

            if (modelAsset._editorPreviewModel)
                model = modelAsset._editorPreviewModel.clone()

            model.lights = [scene.lightEntity.light.light]

            let first = true

            // generate aabb for model
            for (let i = 0; i < model.meshInstances.length; i++) {
                // initialize any skin instance
                if (model.meshInstances[i].skinInstance) {
                    model.meshInstances[i].skinInstance.updateMatrices(model.meshInstances[i].node)
                }

                model.meshInstances[i].material = materials[i % materials.length]

                if (first) {
                    first = false
                    scene.aabb.copy(model.meshInstances[i].aabb)
                } else {
                    scene.aabb.add(model.meshInstances[i].aabb)
                }
            }

            if (first) {
                scene.aabb.center.set(0, 0, 0)
                scene.aabb.halfExtents.set(0.1, 0.1, 0.1)
            }

            scene.material.update()

            const max = scene.aabb.halfExtents.length()
            scene.cameraEntity.setLocalPosition(0, 0, max * 2.5)

            scene.cameraOrigin.setLocalPosition(scene.aabb.center)
            scene.cameraOrigin.setLocalEulerAngles(rotationX, rotationY, 0)
            scene.cameraOrigin.syncHierarchy()

            scene.lightEntity.setLocalRotation(scene.cameraOrigin.getLocalRotation())
            scene.lightEntity.rotateLocal(90, 0, 0)

            scene.cameraEntity.camera.farClip = max * 5.0

            scene.lightEntity.light.intensity = 1.0 / (Math.min(1.0, app.scene.exposure) || 0.01)

            layer.addMeshInstances(model.meshInstances)
            layer.addLight(scene.lightEntity.light)
            layer.addCamera(scene.cameraEntity.camera)

            app.renderer.renderComposition(layerComposition)

            // read pixels from texture
            var device = app.graphicsDevice
            device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, rt._glFrameBuffer)
            device.gl.readPixels(0, 0, width, height, device.gl.RGBA, device.gl.UNSIGNED_BYTE, rt.pixels)

            // render to canvas
            const ctx = this._canvas.getContext('2d')
            ctx.putImageData(new ImageData(rt.pixelsClamped, width, height), (this._canvas.width - width) / 2, (this._canvas.height - height) / 2)

            layer.removeLight(scene.lightEntity.light)
            layer.removeCamera(scene.cameraEntity.camera)
            layer.removeMeshInstances(model.meshInstances)
            layer.renderTarget = null
            scene.previewRoot.enabled = false

            if (model !== scene.modelPlaceholder) {
                model.destroy()
            }
        }

        destroy() {
            if (this._watch) {
                editor.call('assets:model:unwatch', this._asset, this._watch)
                this._watch = null
            }

            this._asset = null
            this._canvas = null

            if (this._frameRequest) {
                cancelAnimationFrame(this._frameRequest)
                this._frameRequest = null
            }
        }
    }

    return ModelThumbnailRenderer
})()


pcui.ModelThumbnailRenderer = ModelThumbnailRenderer

var redo = debounce(async function () {
    // let assetIndex = document.querySelector('.ui-grid.assets').ui.assetsIndex
    await Array.from(redoQueue).map(async ({asset, render}) => {
        let info = asset.json()
        if (info.type === 'model') {
            for (let i = 0; i < info.data.mapping.length; i++) {
                await prepMaterial(info.data.mapping[i].material)
            }
        }
        render()
    })
    redoQueue.clear()
    // editor.emit('preview:scene:changed')
}, 250)


function nextPow2(size) {
    return Math.pow(2, Math.ceil(Math.log(size) / Math.log(2)))
}

var canvas = document.createElement('canvas')
var ctx = canvas.getContext('2d')

