import add from 'ui-container'
import m from 'mithril'
import settings from 'settings'

let active = true
let moveX = false
let moveZ = false
let zoom = '120'

const Dropping = {
    view: function () {
        return settings.enabled.dropToRoot === false ? null : [m('span.ui-button', {
                class: active ? 'active' : '',
                onclick: function () {
                    active = !active
                }
            },
            m('i.fa.fa-chevron-circle-down'),
            'Drop to Root'
        ), active && m('span.ui-button', {
                class: moveX ? 'active' : '',
                onclick: function () {
                    moveX = !moveX
                    moveZ = false
                }
            },
            m('i.fa.fa-chevron-circle-right'),
            'Move X'
        ), active && m('span.ui-button', {
                class: moveZ ? 'active' : '',
                onclick: function () {
                    moveZ = !moveZ
                    moveX = false
                }
            },
            m('i.fa.fa-chevron-circle-up'),
            'Move Z'
        ), m('span.ui-button', {}, [
            m('span', {
                style: {marginRight: '7px'}}, 'Zoom'),
            m('input.field.right-space', {
                placeholder: 'Zoom',
                value: '' + zoom,
                style: {
                    width: '50px'
                },
                oninput: m.withAttr('value', value => zoom = value),
                onfocus: function () {
                    setTimeout(() => {
                        this.setSelectionRange(0, zoom.length)
                    })
                }
            })])]
    }
}

editor.call('hotkey:register', 'dp', {
    key: '5',
    callback() {
        const list = editor.call('entities:list')
        const dp = list.find(p => p.get('name') === 'DropPoint')
        editor.call('selector:clear')
        editor.call('selector:set', 'entity', [dp])
        editor.call('camera:focus', new pc.Vec3(...dp.get('position')), +(zoom || '100'))

    }
})

editor.call('hotkey:register', 'right', {
    key: '6',
    callback() {
        let item = editor.call('entities:selectedFirst')
        if (item) {
            const rotation = item.get('rotation')
            rotation[1] -= 90
            item.set('rotation', rotation)
        }
    }
})

editor.call('hotkey:register', 'left', {
    key: '7',
    callback() {
        let item = editor.call('entities:selectedFirst')
        if (item) {
            const rotation = item.get('rotation')
            rotation[1] += 90
            item.set('rotation', rotation)
        }
    }
})

add(Dropping)

editor.on('entities:add', function (entity) {
    if (!active) return
    let dropping = editor.call('drop:active')
    setTimeout(function () {
        if (dropping) {
            const list = editor.call('entities:list')
            const dp = list.find(p => p.get('name') === 'DropPoint')
            let position, rotation
            if (dp) {
                position = dp.get('position')
                rotation = dp.get('rotation')
            } else {
                position = entity.get('position')
                rotation = entity.get('rotation')
            }
            let box
            if (entity.entity.model) {
                for (let instance of entity.entity.model.model.meshInstances) {
                    if (!box) {
                        box = instance.aabb.clone()
                    } else {
                        box.add(instance.aabb)
                    }
                }
            }
            if (moveX) {
                const p = dp.get('position')
                p[0] += box.halfExtents.x * 2
                dp.set('position', p.slice(0))
            }
            if (moveZ) {
                const p = dp.get('position')
                p[2] -= box.halfExtents.z * 2
                dp.set('position', p.slice(0))
            }
            let root = editor.call('entities:root')
            let parent = editor.call('entities:get', entity.get('parent'))
            parent.removeValue('children', entity.get('resource_id'))
            root.insert('children', entity.get('resource_id'))
            entity.set('parent', root.get('resource_id'))
            entity.set('position', position.slice(0))
            entity.set('rotation', rotation.slice(0))
            editor.call('camera:focus', new pc.Vec3(...position), +(zoom || '100'))

        }
    })

})
