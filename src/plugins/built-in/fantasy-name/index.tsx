import type { Plugin } from '../../types';

export class FantasyNamePlugin implements Plugin {
    id = 'fantasy-name';
    name = 'Fantasy Name Generator';
    version = '1.0.0';
    description = 'Insert a random fantasy name.';
    author = 'Lukewh';
    category = 'utility' as const;
    tags = ['fantasy', 'name', 'generator', 'rpg'];
    permissions: Plugin['permissions'] = ['write_notes'];

    private names = [
        'Aethelgard',
        'Baelor',
        'Caelum',
        'Daeron',
        'Elowen',
        'Faelan',
        'Galadriel',
        'Haldor',
        'Iorithy',
        'Jaehaerys',
        'Kaelthas',
        'Lorthemar',
        'Maeglin',
        'Nymeris',
        'Oberon',
        'Paarthurnax',
        'Quelthalas',
        'Rhaegar',
        'Sylvanas',
        'Thranduil',
        'Uther',
        'Valerius',
        'Windrunner',
        'Xavius',
        'Ysera',
        'Zuljin'
    ];

    async onLoad() {
        console.log('Fantasy Name Plugin loaded');
    }

    async onUnload() {
        console.log('Fantasy Name Plugin unloaded');
    }

    async onEnable() {
        console.log('Fantasy Name Plugin enabled');
    }

    async onDisable() {
        console.log('Fantasy Name Plugin disabled');
    }

    commands = [
        {
            id: 'fantasy-name:insert',
            name: 'Insert Fantasy Name',
            description: 'Insert a random fantasy name at cursor',
            handler: () => {
                const name = this.getRandomName();
                const event = new CustomEvent('synaptic:editor:insert', {
                    detail: { text: name }
                });
                window.dispatchEvent(event);
            }
        }
    ];

    getRandomName(): string {
        return this.names[Math.floor(Math.random() * this.names.length)];
    }
}

export default FantasyNamePlugin;
