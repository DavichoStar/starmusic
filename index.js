"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
//import ytdl from 'ytdl-core-discord';
const ytpl_1 = __importDefault(require("ytpl"));
const lautfm_1 = __importDefault(require("lautfm"));
const laut = new lautfm_1.default();
const ytsearcher_1 = require("ytsearcher");
const youtube_info_1 = __importDefault(require("youtube-info"));
;
const conv = (dinero) => String(dinero).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
exports.start = (client, options) => {
    try {
        class Music {
            constructor(options) {
                // Objecto de Servidores
                this.servidores = new Map();
                this.embedColor = (options && options.embedColor) || 'GREEN';
                this.youtubeKey = (options && options.youtubeKey) || '';
                this.radio = (options && options.radio) || 'http://hd.digitalradio.mx:5883/;';
                this.volumenDef = (options && options.volumenDef) || 50;
                this.colaMax = (options && options.colaMax) || 50;
                this.bitRate = (options && options.bitRate) || "auto";
                this.horaLocal = (options && options.horaLocal) || 'en-US';
                this.djRol = (options && options.djRol) || '';
                this.cualquieraSaca = (options && options.cualquieraSaca) || false;
                this.cualquieraPausa = (options && options.cualquieraPausa) || false;
                this.mensajeNuevaCancion = (options && typeof options.mensajeNuevaCancion !== 'undefined' ? options && options.mensajeNuevaCancion : true);
                this.mostrarNombre = (options && typeof options.mostrarNombre !== 'undefined' ? options && options.mostrarNombre : true);
            }
            async updatePositions(obj, server) {
                return new Promise((resolve, reject) => {
                    if (!obj || typeof obj !== "object")
                        reject();
                    let mm = 0;
                    var newsongs = [];
                    obj.forEach((s) => {
                        if (s.position !== mm)
                            s.position = mm;
                        newsongs.push(s);
                        mm++;
                    });
                    this.servidores.get(server).ultima.position = 0;
                    resolve(newsongs);
                });
            }
            isAdmin(member) {
                if (member.id === member.guild.owner.id)
                    return true;
                else if (member.roles.find((r) => r.id == this.djRol))
                    return true;
                else
                    return member.hasPermission("ADMINISTRATOR");
            }
            canSkip(member, servidores) {
                if (this.isAdmin(member))
                    return true;
                else if (servidores.ultima.autorID === member.id)
                    return true;
                else
                    return false;
            }
            canAdjust(member, servidores) {
                if (servidores.ultima.autorID === member.id)
                    return true;
                else if (this.isAdmin(member))
                    return true;
                else
                    return false;
            }
            setLast(server, ultima) {
                return new Promise((resolve, reject) => {
                    if (this.servidores.has(server)) {
                        let q = this.servidores.get(server);
                        q.ultima = ultima;
                        this.servidores.set(server, q);
                        resolve(this.servidores.get(server));
                    }
                    else {
                        reject("Sin cola de servidor");
                    }
                });
            }
            emptyQueue(server) {
                return new Promise((resolve, reject) => {
                    if (!this.servidores.has(server))
                        reject(new Error(`[Cola vacía] no se ha encontrado ninguna cola para ${server}`));
                    resolve(this.servidores.delete(server));
                });
            }
        }
        const musicbot = new Music(options);
        exports.bot = musicbot;
        if (musicbot.youtubeKey.length <= 1)
            return console.error(new Error("No colocaste la propiedad youtubeKey"));
        musicbot.searcher = new ytsearcher_1.YTSearcher(musicbot.youtubeKey);
        musicbot.playFunction = (msg, args) => {
            if (msg.member.voiceChannel === undefined)
                return msg.channel.send(musicbot.note('fail', `No estas en un canal de voz.`));
            if (!args)
                return msg.channel.send(musicbot.note('fail', '¡No hay video especificado!'));
            if (!musicbot.servidores.has(msg.guild.id))
                musicbot.servidores.set(msg.guild.id, {
                    canciones: [],
                    ultima: null,
                    repetir: "Ninguna",
                    id: msg.guild.id,
                    volumen: musicbot.volumenDef,
                    isPlaying: false
                });
            const servidores = musicbot.servidores.get(msg.guild.id);
            if (servidores.canciones.length >= musicbot.colaMax && musicbot.colaMax !== 0)
                return msg.channel.send(musicbot.note('fail', 'Tamaño máximo de cola alcanzado'));
            var searchstring = args.trim();
            if (searchstring.startsWith('http') && searchstring.includes("list=")) {
                msg.channel.send(musicbot.note("search", `Buscando elementos de la lista de reproducción~`));
                var playid = searchstring.toString().split('list=')[1];
                if (playid.toString().includes('?'))
                    playid = playid.split('?')[0];
                if (playid.toString().includes('&t='))
                    playid = playid.split('&t=')[0];
                ytpl_1.default(playid, function (err, playlist) {
                    if (err)
                        return msg.channel.send(musicbot.note('fail', `Algo salió mal al buscar esa lista de reproducción`));
                    if (playlist.items.length <= 0)
                        return msg.channel.send(musicbot.note('fail', `No se pudo obtener ningún video de esa lista de reproducción.`));
                    if (playlist.total_items >= 50)
                        return msg.channel.send(musicbot.note('fail', `Demasiados videos para poner en cola. Se permite un máximo de 50..`));
                    var index = 0;
                    var ran = 0;
                    playlist.items.forEach(video => {
                        ran++;
                        if (servidores.canciones.length == (musicbot.colaMax + 1) && musicbot.colaMax !== 0 || !video)
                            return;
                        let cancion = {
                            id: video.id,
                            autorID: msg.author.id,
                            position: servidores.canciones.length ? servidores.canciones.length : 0,
                            title: video.title,
                            duracion: video.duration,
                            url: video.url,
                            owner: {
                                name: video.author.name,
                                id: null,
                                image: null
                            }
                        };
                        servidores.canciones.push(cancion);
                        if (servidores.canciones.length === 1)
                            musicbot.play(msg, servidores);
                        index++;
                        if (ran >= playlist.items.length) {
                            if (index == 0)
                                msg.channel.send(musicbot.note('fail', `¡No puedes obtener ninguna canción de esa lista de reproducción!`));
                            else if (index == 1)
                                msg.channel.send(musicbot.note('note', `️️⏭️En cola una canción.`));
                            else if (index > 1)
                                msg.channel.send(musicbot.note('note', `️⏭️️En cola ${index} canciones.`));
                        }
                    });
                });
            }
            else {
                if (searchstring.includes("https://youtu.be/") || searchstring.includes("https://www.youtube.com/") && searchstring.includes("&"))
                    searchstring = searchstring.split("&")[0];
                msg.channel.send(musicbot.note("search", `\`Buscando: ${searchstring}\`...`));
                new Promise(async (resolve, reject) => {
                    let result = await musicbot.searcher.search(searchstring, { type: 'video' });
                    resolve(result.first);
                }).then((res) => {
                    if (!res)
                        return msg.channel.send(musicbot.note("fail", "Algo salió mal. ¡Inténtalo de nuevo!"));
                    let cancion = {
                        id: res.id,
                        autorID: msg.author.id,
                        position: servidores.canciones.length ? servidores.canciones.length : 0
                    };
                    if (servidores.canciones.find((c) => c.id == res.id))
                        return msg.reply("Esa canción ya está en cola, espera a que acabe para escucharla otra vez.");
                    else
                        servidores.canciones.push(cancion);
                    if (servidores.canciones.length === 1 || !client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id))
                        musicbot.play(msg, servidores);
                    else
                        musicbot.buscar_info(msg, cancion, true);
                }).catch((res) => {
                    console.log(res);
                });
            }
        };
        musicbot.busquedaFunction = (msg, args) => {
            if (msg.member.voiceChannel === undefined)
                return msg.channel.send(musicbot.note('fail', `No estas en un canal de voz`));
            if (!args)
                return msg.channel.send(musicbot.note('fail', 'No especificaste algo qué buscar'));
            if (!musicbot.servidores.has(msg.guild.id))
                musicbot.servidores.set(msg.guild.id, {
                    canciones: [],
                    ultima: null,
                    repetir: "Ninguna",
                    id: msg.guild.id,
                    volumen: musicbot.volumenDef,
                    isPlaying: false
                });
            const servidores = musicbot.servidores.get(msg.guild.id);
            if (servidores.canciones.length >= musicbot.colaMax && musicbot.colaMax !== 0)
                return msg.channel.send(musicbot.note('fail', 'Tamaño máximo de cola alcanzado!'));
            let searchstring = args.trim();
            msg.channel.send(musicbot.note('search', `Buscando: \`${searchstring}\``)).then((response) => {
                musicbot.searcher.search(searchstring, {
                    type: 'video'
                }).then((searchResult) => {
                    if (!searchResult.totalResults || searchResult.totalResults === 0)
                        return response.edit(musicbot.note('fail', 'Error al obtener resultados de búsqueda.'));
                    const startTheFun = async (videos, max) => {
                        if (msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
                            const embed = new discord_js_1.default.RichEmbed();
                            embed.setTitle(`Elige tu video`);
                            embed.setColor(musicbot.embedColor);
                            var index = 0;
                            videos.forEach(function (video) {
                                index++;
                                embed.addField(`${index} (${video.channelTitle})`, `[${musicbot.note('font', video.title)}](${video.url})`, true);
                            });
                            if (musicbot.mostrarNombre)
                                embed.setFooter(`Buscado por: ${msg.author.username}`, msg.author.displayAvatarURL);
                            msg.channel.send(embed).then((firstMsg) => {
                                const filter = (m) => {
                                    let contents = [];
                                    for (let i = 0; i < max; i++) {
                                        contents.push(m.content.includes(i + 1));
                                    }
                                    return m.author.id === msg.author.id && (contents) || m.content.trim() === (`cancel`) || m.content.trim() === (`cancelar`);
                                };
                                setTimeout(() => {
                                    msg.channel.awaitMessages(filter, {
                                        max: 1,
                                        time: 60000,
                                        errors: ['time']
                                    }).then((collected) => {
                                        const newColl = Array.from(collected);
                                        const mcon = newColl[0][1].content;
                                        if (mcon === "cancel" || mcon === "cancelar")
                                            return firstMsg.edit(musicbot.note('note', 'Búsqueda cancelada.'));
                                        const song_number = parseInt(mcon) - 1;
                                        if (song_number >= 0) {
                                            firstMsg.delete();
                                            let cancion = {
                                                id: videos[song_number].id,
                                                autorID: msg.author.id,
                                                position: servidores.canciones.length ? servidores.canciones.length : 0,
                                                title: videos[song_number].channelTitle,
                                                url: videos[song_number].url,
                                                owner: {
                                                    name: videos[song_number].name,
                                                    id: videos[song_number].channelId,
                                                    image: null
                                                }
                                            };
                                            servidores.canciones.push(cancion);
                                            if (servidores.canciones.length === 1 || !client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id))
                                                musicbot.play(msg, servidores);
                                            else
                                                musicbot.buscar_info(msg, cancion, true);
                                        }
                                    }).catch((collected) => {
                                        if (collected.toString().match(/error|Error|TypeError|RangeError|Uncaught/))
                                            return firstMsg.edit(`\`\`\`xl\nBúsqueda cancelada. ${collected}\n\`\`\``);
                                        return firstMsg.edit(`\`\`\`xl\nBúsqueda cancelada.\n\`\`\``);
                                    });
                                }, 500);
                            });
                        }
                        else {
                            const vids = videos.map((video, index) => (`**${index + 1}:** __${video.title.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`')}__`)).join('\n\n');
                            msg.channel.send(`\`\`\`\n= Elige tu video =\n${vids}\n\n= Ponga \`cancelar\` o \`cancel\` para cancelar la búsqueda.`).then((firstMsg) => {
                                const filter = (m) => {
                                    let contents = [];
                                    for (let i = 0; i < max; i++) {
                                        contents.push(m.content.includes(i + 1));
                                    }
                                    return m.author.id === msg.author.id && (contents) || m.content.trim() === (`cancel`) || m.content.trim() === (`cancelar`);
                                };
                                msg.channel.awaitMessages(filter, {
                                    max: 1,
                                    time: 60000,
                                    errors: ['time']
                                }).then((collected) => {
                                    const newColl = Array.from(collected);
                                    const mcon = newColl[0][1].content;
                                    if (mcon === "cancel" || mcon === "cancelar")
                                        return firstMsg.edit(musicbot.note('note', 'Búsqueda cancelada.'));
                                    const song_number = parseInt(mcon) - 1;
                                    if (song_number >= 0) {
                                        firstMsg.delete();
                                        let cancion = {
                                            id: videos[song_number].id,
                                            autorID: msg.author.id,
                                            position: servidores.canciones.length ? servidores.canciones.length : 0,
                                            title: videos[song_number].channelTitle,
                                            url: videos[song_number].url,
                                            owner: {
                                                name: videos[song_number].name,
                                                id: videos[song_number].channelId,
                                                image: null
                                            }
                                        };
                                        servidores.canciones.push(cancion);
                                        if (servidores.canciones.length === 1 || !client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id))
                                            musicbot.play(msg, servidores);
                                        else
                                            musicbot.buscar_info(msg, cancion, true);
                                    }
                                }).catch((collected) => {
                                    if (collected.toString()
                                        .match(/error|Error|TypeError|RangeError|Uncaught/))
                                        return firstMsg.edit(`\`\`\`xl\nBúsqueda cancelada. ${collected}\n\`\`\``);
                                    return firstMsg.edit(`\`\`\`xl\nBúsqueda cancelada.\n\`\`\``);
                                });
                            });
                        }
                    };
                    const max = searchResult.totalResults >= 10 ? 9 : searchResult.totalResults - 1;
                    var videos = [];
                    for (var i = 0; i < 99; i++) {
                        var result = searchResult.currentPage[i];
                        result.autorID = msg.author.id;
                        videos.push(result);
                        if (i === max) {
                            i = 101;
                            startTheFun(videos, max);
                        }
                    }
                });
            })
                .catch(console.log);
        };
        musicbot.radioFunction = (msg, stream = false) => {
            if (msg.member.voiceChannel === undefined)
                return msg.channel.send(musicbot.note('fail', `No estas en un canal de voz.`));
            if (!musicbot.servidores.has(msg.guild.id))
                musicbot.servidores.set(msg.guild.id, {
                    canciones: [],
                    ultima: null,
                    repetir: "Ninguna",
                    id: msg.guild.id,
                    volumen: musicbot.volumenDef,
                    isPlaying: false
                });
            new Promise((resolve, reject) => {
                let voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                if (voiceConnection === null) {
                    if (msg.member.voiceChannel && msg.member.voiceChannel.joinable) {
                        msg.member.voiceChannel.join().then((connection) => {
                            resolve(connection);
                        }).catch((error) => {
                            console.error(error);
                        });
                    }
                    else if (!msg.member.voiceChannel.joinable || msg.member.voiceChannel.full) {
                        msg.channel.send(musicbot.note('fail', '¡No tengo permiso para unirme a tu canal de voz!'));
                        reject();
                    }
                    else
                        reject();
                }
                else
                    resolve(voiceConnection);
            }).then(async (connection) => {
                if (stream) {
                    let estadoServer = await laut.getServerStatus();
                    if (!estadoServer || !estadoServer.running)
                        return msg.channel.send(`Servidor de Radio No disponible: \`${estadoServer.message}\``);
                    stream = await laut.searchStations({ query: stream, limit: 1 }).catch((err) => console.error(err));
                    let rdio = stream.results[0].items[0].station;
                    connection.playStream(rdio.stream_url, {
                        bitrate: musicbot.bitRate,
                        volume: (musicbot.servidores.get(msg.guild.id).volumen / 100)
                    });
                    let horaR = new Date(rdio.updated_at);
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor(rdio.color.length > 1 ? rdio.color : rdio.curren_playlist.color.length > 1 ? rdio.curren_playlist.color : "RANDOM")
                        .setThumbnail(rdio.images.station)
                        .setDescription(`:radio: Radio ${client.user.username} Activado~
              \n🎶◉Estación: [.::\`${rdio.display_name}\`::.]
              \nDescripción: \`${rdio.description}\`
              \nDj's: ${rdio.djs.length > 1 ? rdio.djs : "Sin Dj's"} | Lugar: ${rdio.location.length > 1 ? rdio.location : "Desconocido"}
              \n▶PlayList en Reproducción: ${rdio.current_playlist.name}
              \n🕐Fecha de la Emisora: ${horaR} | 🕥Termina: ${rdio.current_playlist.end_time}:00 hrs
              \n▶PlayList que Sigue: ${rdio.next_playlist.name}
              \n🕐Empieza: ${rdio.next_playlist.hour}:00 hrs | 🕥Termina: ${rdio.next_playlist.end_time}:00 hrs
              \n📶◉En Línea: [24/7]`);
                    msg.channel.send(embed);
                }
                else {
                    connection.playStream(musicbot.radio, {
                        bitrate: musicbot.bitRate,
                        volume: (musicbot.servidores.get(msg.guild.id).volumen / 100)
                    });
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor("RANDOM")
                        .setDescription(`:radio: Radio ${client.user.username} Activado~
              \n🎶◉Escuchando: [.::\`${musicbot.radio}\`::.]
              \n📶◉En Línea: [24/7]`);
                    msg.channel.send(embed);
                }
            });
        };
        musicbot.pausaFunction = (msg) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            if (voiceConnection === null)
                return msg.channel.send(musicbot.note('fail', 'No se está reproduciendo música.'));
            let authorC = musicbot.servidores.get(msg.guild.id).ultima;
            if (authorC.autorID !== msg.author.id || !musicbot.isAdmin(msg.member) && !musicbot.cualquieraPausa)
                return msg.channel.send(musicbot.note('fail', 'No tienes permiso de pausar.'));
            const dispatcher = voiceConnection.player.dispatcher;
            if (dispatcher.paused)
                return msg.channel.send(musicbot.note(`fail`, `¡La música ya está en pausa!`));
            else
                dispatcher.pause();
            msg.channel.send(musicbot.note('note', 'Reproducción en pausa.'));
        };
        musicbot.reanudarFunction = (msg) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            if (voiceConnection === null)
                return msg.channel.send(musicbot.note('fail', 'No se está reproduciendo música'));
            let authorC = musicbot.servidores.get(msg.guild.id).ultima;
            if (authorC.autorID !== msg.author.id || !musicbot.isAdmin(msg.member) && !musicbot.cualquieraPausa)
                return msg.channel.send(musicbot.note('fail', `No tienes permiso de reanudar.`));
            const dispatcher = voiceConnection.player.dispatcher;
            if (!dispatcher.paused)
                return msg.channel.send(musicbot.note('fail', `La música no está páusada.`));
            else
                dispatcher.resume();
            msg.channel.send(musicbot.note('note', 'Reproducción Reanudada.'));
        };
        musicbot.omitirFunction = (msg) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            const servidores = musicbot.servidores.get(msg.guild.id);
            if (voiceConnection === null)
                return msg.channel.send(musicbot.note('fail', 'No se está buscar_info música.'));
            if (!musicbot.canSkip(msg.member, servidores))
                return msg.channel.send(musicbot.note('fail', `No puedes saltear esto porque no hay una cola de reproducción.`));
            if (musicbot.servidores.get(msg.guild.id).repetir == "canción")
                return msg.channel.send(musicbot.note("fail", "No se puede omitir mientras que el bucle está configurado como simple."));
            const dispatcher = voiceConnection.player.dispatcher;
            if (!dispatcher || dispatcher === null)
                return msg.channel.send(musicbot.note("fail", "Algo salió mal corriendo y saltando."));
            if (dispatcher.paused)
                dispatcher.end();
            dispatcher.end();
            msg.channel.send(musicbot.note("note", "Canción omitida."));
        };
        musicbot.salirFunction = (msg) => {
            if (musicbot.isAdmin(msg.member) || musicbot.cualquieraSaca === true) {
                const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                if (voiceConnection === null)
                    return msg.channel.send(musicbot.note('fail', 'No estoy en un canal de voz.'));
                musicbot.emptyQueue(msg.guild.id);
                if (!voiceConnection.player.dispatcher)
                    return;
                voiceConnection.player.dispatcher.end();
                voiceConnection.disconnect();
                msg.channel.send(musicbot.note('note', 'Dejé con éxito el canal de voz.'));
            }
            else
                msg.channel.send(musicbot.note('fail', `Me temo que no puedo dejar que hagas eso, ${msg.author.username}.`));
        };
        musicbot.npFunction = (msg) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            const servidores = musicbot.servidores.get(msg.guild.id);
            if (voiceConnection === null)
                return msg.channel.send(musicbot.note('fail', 'No hay Música sonando.'));
            if (servidores.canciones.length <= 0)
                return msg.channel.send(musicbot.note('note', 'Cola vacía.'));
            if (msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
                const embed = new discord_js_1.default.RichEmbed();
                try {
                    embed
                        .setAuthor(client.user.username, client.user.displayAvatarURL)
                        .setColor(musicbot.embedColor)
                        .setThumbnail(servidores.ultima.owner.image)
                        .setImage(`https://i3.ytimg.com/vi/${servidores.ultima.id}/2.jpg`)
                        .setColor(musicbot.embedColor)
                        .addField("🔊Escuchando:", `[${servidores.ultima.title}](${servidores.ultima.url}) por: 👤[${servidores.ultima.owner.name}](https://www.youtube.com/channel/${servidores.ultima.owner.id})`, true)
                        .addField("⏭En Cola", servidores.canciones.length, true);
                    const resMem = client.users.get(servidores.ultima.autorID);
                    if (musicbot.mostrarNombre && resMem)
                        embed.setFooter(`Solicitado por: ${resMem.username}`, resMem.displayAvatarURL);
                    if (musicbot.mostrarNombre && !resMem)
                        embed.setFooter(`Solicitado por: \`Usuario desconocido (ID: ${servidores.ultima.autorID})\``);
                    msg.channel.send(embed);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [npCmd] ` + e.stack);
                }
            }
            else {
                try {
                    let solicitado = "";
                    const resMem = client.users.get(servidores.ultima.autorID);
                    if (musicbot.mostrarNombre && resMem)
                        solicitado = `Solicitado por: ${resMem.username}`;
                    if (musicbot.mostrarNombre && !resMem)
                        solicitado = `Solicitado por: \`Usuario desconocido (ID: ${servidores.ultima.autorID})\``;
                    msg.channel.send(`
          🔊Escuchando: **${servidores.ultima.title}**
          \npor: 👤[${servidores.ultima.owner.name}](https://www.youtube.com/channel/${servidores.ultima.owner.id})
          \n${solicitado}
          \n⏭En Cola: ${servidores.canciones.length}`);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [npCmd] ` + e.stack);
                }
            }
            musicbot.reproductor(msg, servidores.ultima);
        };
        musicbot.repetirFunction = (msg, args) => {
            if (!musicbot.servidores.has(msg.guild.id))
                return msg.channel.send(musicbot.note('fail', `No se ha encontrado ninguna cola para este servidor!`));
            if (parseInt(args) == 1 || !args && musicbot.servidores.get(msg.guild.id).repetir == "Ninguna") {
                musicbot.servidores.get(msg.guild.id).repetir = "canción";
                msg.channel.send(musicbot.note('note', '¡Repetir una cancíon habilitado! :repeat_one:'));
            }
            else if (parseInt(args) == 2 || !args && musicbot.servidores.get(msg.guild.id).repetir == "canción") {
                musicbot.servidores.get(msg.guild.id).repetir = "todo";
                msg.channel.send(musicbot.note('note', '¡Repetir Cola habilitada! :repeat:'));
            }
            else if (parseInt(args) == 0 || parseInt(args) == 3 || !args && musicbot.servidores.get(msg.guild.id).repetir == "todo") {
                musicbot.servidores.get(msg.guild.id).repetir = "Ninguna";
                msg.channel.send(musicbot.note('note', '¡Repetir canciones deshabilitado! :arrow_forward:'));
                const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                const dispatcher = voiceConnection.player.dispatcher;
                let wasPaused = dispatcher.paused;
                if (wasPaused)
                    dispatcher.pause();
                let newq = musicbot.servidores.get(msg.guild.id).canciones.slice(musicbot.servidores.get(msg.guild.id).ultima.position - 1);
                if (newq !== musicbot.servidores.get(msg.guild.id).canciones)
                    musicbot.updatePositions(newq, msg.guild.id)
                        .then((res) => musicbot.servidores.get(msg.guild.id).canciones = res);
                if (wasPaused)
                    dispatcher.resume();
            }
        };
        musicbot.colaFunction = (msg, args) => {
            if (!musicbot.servidores.has(msg.guild.id))
                return msg.channel.send(musicbot.note("fail", "No se pudo encontrar una cola para este servidor."));
            else if (musicbot.servidores.get(msg.guild.id).canciones.length <= 0)
                return msg.channel.send(musicbot.note("fail", "La cola esta vacía."));
            const servidores = musicbot.servidores.get(msg.guild.id);
            const embed = new discord_js_1.default.RichEmbed()
                .setColor(musicbot.embedColor);
            if (args) {
                let video = servidores.canciones.find((s) => s.position == parseInt(args) - 1);
                if (!video)
                    return msg.channel.send(musicbot.note("fail", "No pude encontrar ese video."));
                embed.setAuthor('Canción en cola', client.user.avatarURL)
                    .setTitle(video.owner.name)
                    .setURL(`https://www.youtube.com/channel/${video.owner.id}`)
                    .setDescription(`[${video.title}](${video.url})\nDuración: ${typeof video.duracion == "number" ? musicbot.tiempo(video.duracion) : video.duracion}`)
                    .addField("En Cola", servidores.canciones.length, true)
                    .addField("Posición", video.position + 1, true)
                    .setThumbnail(`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`);
                const resMem = client.users.get(video.autorID);
                if (musicbot.mostrarNombre && resMem)
                    embed.setFooter(`Solicitado por: ${resMem.username}`, resMem.displayAvatarURL);
                if (musicbot.mostrarNombre && !resMem)
                    embed.setFooter(`Solicitado por: \`Usuario desconocido (ID: ${video.autorID})\``);
                msg.channel.send({ embed });
            }
            else {
                if (servidores.canciones.length > 11) {
                    let pages = [];
                    let page = 1;
                    const newSongs = servidores.canciones.musicArraySort(10);
                    newSongs.forEach((s) => {
                        var i = s.map((video, index) => (`**${video.position + 1}:** __${video.title}__`)).join('\n\n');
                        if (i !== undefined)
                            pages.push(i);
                    });
                    embed.setAuthor('Canciones en cola', client.user.avatarURL)
                        .setFooter(`Página ${page} de ${pages.length}`)
                        .setDescription(pages[page - 1]);
                    msg.channel.send(embed).then(async (m) => {
                        await m.react('⏪');
                        await m.react('⏩');
                        let siguienteFilter = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏩' && user.id === msg.author.id, { time: 120000 });
                        let regresarFilter = m.createReactionCollector((reaction, user) => reaction.emoji.name === '⏪' && user.id === msg.author.id, { time: 120000 });
                        siguienteFilter.on('collect', (r) => {
                            if (page === pages.length)
                                return;
                            page++;
                            embed.setDescription(pages[page - 1]);
                            embed.setFooter(`Página ${page} de ${pages.length}`, msg.author.displayAvatarURL);
                            m.edit(embed);
                        });
                        regresarFilter.on('collect', (r) => {
                            if (page === 1)
                                return;
                            page--;
                            embed.setDescription(pages[page - 1]);
                            embed.setFooter(`Página ${page} de ${pages.length}`, msg.author.displayAvatarURL);
                            m.edit(embed);
                        });
                    });
                }
                else {
                    var nuevasC = musicbot.servidores.get(msg.guild.id).canciones.map((video, index) => (`**${video.position + 1}:** __${video.title}__`)).join('\n\n');
                    embed.setAuthor('Canciones en cola', client.user.avatarURL)
                        .setDescription(nuevasC)
                        .setFooter(`Página 1 de 1`, msg.author.displayAvatarURL);
                    return msg.channel.send(embed);
                }
            }
        };
        musicbot.volumenFunction = (msg, args) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            if (voiceConnection === null)
                return msg.channel.send(musicbot.note('fail', 'No se reproduce música.'));
            if (!musicbot.canAdjust(msg.member, musicbot.servidores.get(msg.guild.id)))
                return msg.channel.send(musicbot.note('fail', `Sólo los administradores o DJ's pueden cambiar el volumen.`));
            const dispatcher = voiceConnection.player.dispatcher;
            if (!args || isNaN(args))
                return msg.channel.send(musicbot.note('fail', 'Sin volumen especificado.'));
            args = parseInt(args);
            if (args > 200 || args <= 0)
                return msg.channel.send(musicbot.note('fail', 'Volumen fuera de rango, debe estar dentro de 1 a 200'));
            dispatcher.setVolume((args / 100));
            musicbot.servidores.get(msg.guild.id).volumen = args;
            msg.channel.send(musicbot.note('note', `Volumen cambiado a ${args}%.`));
        };
        musicbot.limpiarFunction = (msg) => {
            if (!musicbot.servidores.has(msg.guild.id))
                return msg.channel.send(musicbot.note("fail", "No se ha encontrado ninguna cola para este servidor.."));
            if (!musicbot.isAdmin(msg.member))
                return msg.channel.send(musicbot.note("fail", `Sólo los administradores o personas con el ${musicbot.djRol} puede borrar colas.`));
            musicbot.emptyQueue(msg.guild.id).then(() => {
                msg.channel.send(musicbot.note("note", "Cola borrada."));
                const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                if (voiceConnection !== null) {
                    const dispatcher = voiceConnection.player.dispatcher;
                    if (!dispatcher || dispatcher === null) {
                        console.log(new Error(`dispatcher nulo en saltar cmd [${msg.guild.name}] [${msg.author.username}]`));
                        return msg.channel.send(musicbot.note("fail", "Algo salió mal."));
                    }
                    if (dispatcher.paused)
                        dispatcher.end();
                    dispatcher.end();
                }
            }).catch((res) => {
                console.error(new Error(`[clearCmd] [${msg.guild.id}] ${res}`));
                return msg.channel.send(musicbot.note("fail", "Algo salió mal limpiando la cola."));
            });
        };
        musicbot.removerFunction = (msg, args) => {
            if (!musicbot.servidores.has(msg.guild.id))
                return msg.channel.send(musicbot.note('fail', `No se ha encontrado ninguna cola para este servidor.`));
            if (!args)
                return msg.channel.send(musicbot.note("fail", "No colocaste la posición del video."));
            if (parseInt(args) - 1 == 0)
                return msg.channel.send(musicbot.note("fail", "No puedes borrar la música que se está reproduciendo actualmente."));
            let cancionR = musicbot.servidores.get(msg.guild.id).canciones.find((x) => x.position == parseInt(args) - 1);
            if (cancionR) {
                if (cancionR.autorID !== msg.author.id || !musicbot.isAdmin(msg.member))
                    return msg.channel.send(musicbot.note("fail", "No puedes eliminar ese objeto."));
                let newq = musicbot.servidores.get(msg.guild.id).canciones.filter((s) => s !== cancionR);
                musicbot.updatePositions(newq, msg.guild.id).then((res) => {
                    musicbot.servidores.get(msg.guild.id).canciones = res;
                    msg.channel.send(musicbot.note("note", `Eliminado:  \`${cancionR.title}\``));
                });
            }
            else
                msg.channel.send(musicbot.note("fail", "No se pudo encontrar ese video o algo salió mal."));
        };
        // ===============[ Función Principal ]=============== //
        musicbot.play = (msg, servidores) => {
            if (servidores.canciones.length <= 0) {
                msg.channel.send(musicbot.note('note', 'Reproducción Terminada~'));
                let voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                if (voiceConnection !== null)
                    return voiceConnection.disconnect();
                musicbot.servidores.delete(msg.guild.id);
            }
            new Promise((resolve, reject) => {
                let voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                if (voiceConnection === null) {
                    if (msg.member.voiceChannel && msg.member.voiceChannel.joinable) {
                        msg.member.voiceChannel.join().then((connection) => {
                            resolve(connection);
                        }).catch((error) => {
                            console.error(error);
                        });
                    }
                    else if (!msg.member.voiceChannel.joinable || msg.member.voiceChannel.full) {
                        msg.channel.send(musicbot.note('fail', '¡No tengo permiso para unirme a tu canal de voz!'));
                        reject();
                    }
                    else
                        musicbot.emptyQueue(msg.guild.id).then(() => {
                            reject();
                        });
                }
                else
                    resolve(voiceConnection);
            })
                .then(async (connection) => {
                let video;
                if (!servidores.ultima) {
                    video = servidores.canciones[0];
                    musicbot.buscar_info(msg, video);
                }
                else {
                    if (servidores.repetir == "todo") {
                        video = servidores.canciones.find((s) => s.position == servidores.ultima.position + 1);
                        if (!video || video && !video.id)
                            video = servidores.canciones[0];
                    }
                    else if (servidores.repetir == "single")
                        video = servidores.ultima;
                    else
                        video = servidores.canciones.find((s) => s.position == servidores.ultima.position);
                }
                if (!video) {
                    video = musicbot.servidores.get(msg.guild.id).canciones ? musicbot.servidores.get(msg.guild.id).canciones[0] : false;
                    if (!video) {
                        msg.channel.send(musicbot.note('note', 'Reproducción Terminada'));
                        musicbot.emptyQueue(msg.guild.id);
                        const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                        if (voiceConnection !== null)
                            return voiceConnection.disconnect();
                    }
                }
                if (musicbot.mensajeNuevaCancion == true && servidores.ultima && musicbot.servidores.get(msg.guild.id).repetir !== "canción")
                    musicbot.buscar_info(msg, video);
                try {
                    musicbot.setLast(msg.guild.id, video);
                    let dispatcher = connection.playStream(ytdl_core_1.default(`https://www.youtube.com/watch?v=${video.id}`, {
                        filter: 'audioonly'
                    }), {
                        bitrate: musicbot.bitRate,
                        volume: (musicbot.servidores.get(msg.guild.id).volumen / 100)
                    });
                    connection.on('error', (error) => {
                        console.error(error);
                        if (msg && msg.channel)
                            msg.channel.send(musicbot.note('fail', `Algo salió mal con la conexión. Volviendo a intentar cola ...`));
                        musicbot.play(msg, musicbot.servidores.get(msg.guild.id));
                    });
                    dispatcher.on('error', (error) => {
                        console.error(error);
                        if (msg && msg.channel)
                            msg.channel.send(musicbot.note('fail', `Algo salió mal al tocar música. Volviendo a intentar cola ...`));
                        musicbot.play(msg, musicbot.servidores.get(msg.guild.id));
                    });
                    dispatcher.on('end', () => {
                        setTimeout(() => {
                            if (!musicbot.servidores.get(msg.guild.id))
                                return;
                            let seRepite = musicbot.servidores.get(msg.guild.id).repetir;
                            if (musicbot.servidores.get(msg.guild.id).canciones.length > 0) {
                                if (seRepite == "Ninguna" || seRepite == null) {
                                    musicbot.servidores.get(msg.guild.id).canciones.shift();
                                    musicbot.updatePositions(musicbot.servidores.get(msg.guild.id).canciones, msg.guild.id).then((res) => {
                                        musicbot.servidores.get(msg.guild.id).canciones = res;
                                        musicbot.play(msg, musicbot.servidores.get(msg.guild.id));
                                    }).catch((err) => { console.error("Algo salió mal moviendo la cola: ", err); });
                                }
                                else if (seRepite == "todo" || seRepite == "canción") {
                                    musicbot.play(msg, musicbot.servidores.get(msg.guild.id));
                                }
                            }
                            else if (musicbot.servidores.get(msg.guild.id).canciones.length <= 0) {
                                msg.channel.send(musicbot.note('note', 'Reproducción Terminada.'));
                                musicbot.servidores.delete(msg.guild.id);
                                const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
                                if (voiceConnection !== null)
                                    return voiceConnection.disconnect();
                            }
                        }, 1250);
                    });
                }
                catch (error) {
                    console.log(error);
                }
            })
                .catch((error) => {
                console.log(error);
            });
        };
        // ===============[ Funciones Internas ]=============== //
        musicbot.buscar_info = (msg, res, cola = false) => {
            youtube_info_1.default(res.id, async function (err, videoInfo) {
                if (err)
                    return console.error(err);
                res.title = videoInfo.title;
                res.duracion = conv(`${parseInt(videoInfo.duration) - 1}`);
                res.fecha = videoInfo.datePublished;
                res.genero = videoInfo.genre;
                res.vistas = conv(videoInfo.views);
                res.likes = conv(videoInfo.likeCount);
                res.dislikes = conv(videoInfo.dislikeCount);
                res.url = videoInfo.url;
                res.owner = {
                    name: videoInfo.owner,
                    id: videoInfo.channelId != undefined ? videoInfo.channelId : videoInfo.owner,
                    image: videoInfo.channelThumbnailUrl.startsWith("//") ? videoInfo.channelThumbnailUrl.replace("//", 'https://') : videoInfo.channelThumbnailUrl
                };
                if (cola)
                    musicbot.agregado_a_cola(msg, res);
                else
                    musicbot.mensaje(msg, res);
            });
        };
        musicbot.agregado_a_cola = (msg, res) => {
            const servidores = musicbot.servidores.get(msg.guild.id);
            const resMem = client.users.get(res.autorID);
            if (msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
                try {
                    const embed = new discord_js_1.default.RichEmbed()
                        .setAuthor('⏭️Agregando a la cola', client.user.avatarURL)
                        .setColor(musicbot.embedColor)
                        .setThumbnail(`https://i3.ytimg.com/vi/${res.id}/2.jpg`)
                        .addField("Agregado a Cola:", `[${res.title}](${res.url}) por: [${res.owner.name}](https://www.youtube.com/channel/${res.owner.id})`)
                        .addField("En cola", servidores.canciones.length, true)
                        .addField("Estadísticas", `📅Publicado el: ${res.fecha}\n⏲️Duración: ${res.duracion}`);
                    if (musicbot.mostrarNombre && resMem)
                        embed.setFooter(`Solicitado por: ${resMem.username}`, resMem.displayAvatarURL);
                    if (musicbot.mostrarNombre && !resMem)
                        embed.setFooter(`Solicitado por: \`Usuario desconocido (ID: ${res.autorID})\``);
                    msg.channel.send(embed);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [agrColaCmd] `, e);
                }
            }
            else {
                try {
                    let solicitado = "";
                    if (musicbot.mostrarNombre && resMem)
                        solicitado = `Solicitado por: ${resMem.username}`;
                    if (musicbot.mostrarNombre && !resMem)
                        solicitado = `Solicitado por: \`Usuario desconocido (ID: ${res.autorID})\``;
                    msg.channel.send(`
            ⏭️Agregado a cola: **${res.title}**
            \n${solicitado}
            \nEn cola: ${servidores.canciones.length}
            📅Publicado el: ${res.fecha}
            \n⏲️Duración: ${res.duracion}
          `);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [agrColaElseCmd] ` + e);
                }
            }
        };
        musicbot.mensaje = async (msg, res) => {
            const servidores = musicbot.servidores.get(msg.guild.id);
            const resMem = client.users.get(res.autorID);
            if (msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
                try {
                    const embed = new discord_js_1.default.RichEmbed()
                        .setAuthor(client.user.username, client.user.displayAvatarURL)
                        .setColor(musicbot.embedColor)
                        .setThumbnail(res.owner.image)
                        .setImage(`https://i3.ytimg.com/vi/${res.id}/2.jpg`)
                        .addField("🔊Escuchando:", `[${res.title}](${res.url}) por: 👤[${res.owner.name}](https://www.youtube.com/channel/${res.owner.id})`)
                        .addField("⏭En cola", servidores.canciones.length, true)
                        .addField("Estadísticas", `📅Publicado el: ${res.fecha}\nGénero: ${res.genero}\n👥Vistas: ${res.vistas}\n👍Me Gusta: ${res.likes}\n👎No Me Gusta: ${res.dislikes}`);
                    if (musicbot.mostrarNombre && resMem)
                        embed.setFooter(`Solicitado por: ${resMem.username}`, resMem.displayAvatarURL);
                    if (musicbot.mostrarNombre && !resMem)
                        embed.setFooter(`Solicitado por: \`Usuario desconocido (ID: ${res.autorID})\``);
                    await msg.channel.send(embed);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [mensajeCmd] ` + e);
                }
            }
            else {
                try {
                    let solicitado = "";
                    if (musicbot.mostrarNombre && resMem)
                        solicitado = `Solicitado por: ${resMem.username}`;
                    if (musicbot.mostrarNombre && !resMem)
                        solicitado = `Solicitado por: \`Usuario desconocido (ID: ${res.autorID})\``;
                    await msg.channel.send(`
            🔊Escuchando ahora: **${res.title}**
            \n${solicitado}
            \n⏭En cola: ${servidores.canciones.length}
          `);
                }
                catch (e) {
                    console.error(`[${msg.guild.name}] [mensajeElseCmd] ` + e);
                }
            }
            musicbot.reproductor(msg, res);
        };
        musicbot.reproductor = async (msg, res) => {
            const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
            let dispatcher = voiceConnection.player.dispatcher;
            if (msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
                let embed = new discord_js_1.default.RichEmbed()
                    .addField(`Reproducción Actual: 0:0 :⏲: 0:0`, "🔴────────────────────────────── [0%]");
                await msg.channel.send(embed).then((m) => {
                    let tiempoM = setInterval(() => {
                        let embedTimer = new discord_js_1.default.RichEmbed();
                        let duracionD = dispatcher ? dispatcher.time : false;
                        if (!duracionD)
                            return clearInterval(tiempoM);
                        else
                            dispatcher.on('end', () => clearInterval(tiempoM));
                        if (res.duracion) {
                            let porcentaje = duracionD * 100 / (res.duracion * 1000);
                            porcentaje = Math.trunc(porcentaje);
                            let l = "─";
                            let por = porcentaje * 30 / 100;
                            por = Math.trunc(por);
                            let progreso = `${l.repeat(por)}🔴${l.repeat(30 - por)} [${porcentaje}%]`;
                            embedTimer.addField(`Reproducción Actual: ${musicbot.tiempo(duracionD / 1000)} :⏲: ${musicbot.tiempo(res.duracion)}`, progreso);
                        }
                        else
                            embedTimer.addField("Reproducción Actual:", musicbot.tiempo(duracionD / 1000) + " ⏲");
                        m.edit(embedTimer);
                    }, 2000);
                });
            }
            else {
                await msg.channel.send(`Reproducción Actual: 0:0 :⏲: 0:0
          \n\n🔴────────────────────────────── [0%]`).then((m) => {
                    let tiempoM = setInterval(() => {
                        let duracionD = dispatcher ? dispatcher.time : false;
                        if (!duracionD)
                            return clearInterval(tiempoM);
                        else
                            dispatcher.on('end', () => clearInterval(tiempoM));
                        let texto;
                        if (res.duracion) {
                            let porcentaje = duracionD * 100 / (res.duracion * 1000);
                            porcentaje = Math.trunc(porcentaje);
                            let l = "─"; //68
                            let por = porcentaje * 30 / 100;
                            por = Math.trunc(por);
                            let progreso = `${l.repeat(por)}🔴${l.repeat(30 - por)} [${porcentaje}%]`;
                            texto = `Reproducción Actual: ${musicbot.tiempo(duracionD / 1000)} :⏲: ${musicbot.tiempo(res.duracion)}\n\n${progreso}`;
                        }
                        else
                            texto = "Reproducción Actual:" + musicbot.tiempo(duracionD / 1000) + " ⏲";
                        m.edit(texto);
                    }, 2000);
                });
            }
        };
        musicbot.tiempo = (time) => {
            var hrs = ~~(time / 3600);
            var mins = ~~((time % 3600) / 60);
            var secs = ~~time % 60;
            var ret = "";
            if (hrs > 0)
                ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
            ret += "" + mins + ":" + (secs < 10 ? "0" : "");
            ret += "" + secs;
            return ret;
        };
        musicbot.note = (type, text) => {
            if (type === 'wrap') {
                let ntext = text
                    .replace(/`/g, '`' + String.fromCharCode(8203))
                    .replace(/@/g, '@' + String.fromCharCode(8203))
                    .replace(client.token, 'ELIMINADO');
                return '```\n' + ntext + '\n```';
            }
            else if (type === 'note')
                return ':musical_note: | ' + text.replace(/`/g, '`' + String.fromCharCode(8203));
            else if (type === 'search')
                return ':mag: | ' + text.replace(/`/g, '`' + String.fromCharCode(8203));
            else if (type === 'fail')
                return ':no_entry_sign: | ' + text.replace(/`/g, '`' + String.fromCharCode(8203));
            else if (type === 'font') {
                return text.replace(/`/g, '`' + String.fromCharCode(8203))
                    .replace(/@/g, '@' + String.fromCharCode(8203))
                    .replace(/\\/g, '\\\\')
                    .replace(/\*/g, '\\*')
                    .replace(/_/g, '\\_')
                    .replace(/~/g, '\\~')
                    .replace(/`/g, '\\`');
            }
            else if (type == 'error')
                console.error(new Error(`[ERROR]: ${text}`));
            else
                console.error(new Error(`${type} es un tipo inválido`));
        };
        Object.defineProperty(Array.prototype, 'musicArraySort', {
            value: function (n) {
                return Array.from(Array(Math.ceil(this.length / n)), (_, i) => this.slice(i * n, i * n + n));
            }
        });
    }
    catch (e) {
        console.error(new Error(`[ERROR]: ${e}`));
    }
};
