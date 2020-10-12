import m from 'mithril'
import add from 'ui-container'
import settings from 'settings'


function snap() {
    let increment = +(size || '0') || editor.call('settings:projectUser').get('editor').snapIncrement
    let items = editor.call('selector:items')
    items.forEach(item => {
        let position = item.get('position')
        for (let i = 0; i < 3; i++) {
            position[i] = Math.round(position[i] / increment) * increment
        }
        item.set('position', position)
    })
}

function snapRotation() {
    let items = editor.call('selector:items')
    items.forEach(item => {
        let rotation = item.get('rotation')
        let sign = rotation[1] < 0 ? -1 : 1
        rotation[1] = Math.round(Math.abs(rotation[1]) / 90) * 90 * sign
        item.set('rotation', rotation)
    })
}
let size = 25

editor.call('hotkey:register', 'snap', {
    key: '8',
    callback:snap
})

const Snap = {
    view: function () {
        return settings.enabled.snapButtons === false ? null : [
            m('span.ui-button', {
                    onclick: snap
                },
                m('i.fa.fa-square'),
                m('span', {style: {marginRight: '7px'}}, "Snap"),
                m('input.field.right-space', {
                    placeholder: "Size",
                    value: "" + size,
                    style: {
                        marginLeft: 16,
                        width: '50px'
                    },
                    oninput: m.withAttr('value', value => size = value),
                    onfocus: function () {
                        setTimeout(() => {
                            this.setSelectionRange(0, size.length)
                        })
                    }
                }),
            ), m('span.ui-button', {
                    onclick: snapRotation
                },
                m('i.fa.fa-circle'),
                "Snap Rotation"
            )]
    }
}

editor.call('hotkey:register', 'snap:grid', {
    key: 't',
    callback: snap
});

editor.call('hotkey:register', 'snap:rotation', {
    key: 'l',
    callback: snapRotation
});


add(Snap)
