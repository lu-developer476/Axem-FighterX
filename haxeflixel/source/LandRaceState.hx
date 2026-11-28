package;

import flixel.FlxG;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.util.FlxColor;
import openfl.utils.Assets;

class LandRaceState extends RaceBaseState
{
    static final DISTANCES:Array<Int> = [750000, 2500000];
    static inline var MAX_STAMINA:Float = 100;

    var playerModes:Map<String, FlxSprite>;
    var rivalModes:Map<String, FlxSprite>;
    var mapAssets:Array<String> = [];
    var mapIndex:Int = 0;
    var finishDistance:Float = 750000;
    var distanceIndex:Int = 0;
    var playerDistance:Float = 0;
    var rivalDistance:Float = 0;
    var stamina:Float = MAX_STAMINA;
    var countdown:Float = 3;
    var started:Bool = false;
    var finished:Bool = false;
    var staminaFill:FlxSprite;
    var progressLabel:FlxText;
    var resultLabel:FlxText;
    var playerActionMode:String = "";
    var playerActionMs:Float = 0;

    override public function create():Void
    {
        super.create();
        mapAssets = discoverMapAssets("terrestrial");
        if (mapAssets.length > 0) addBackground(mapAssets[mapIndex]);
        FlxG.sound.playMusic(Assets.getMusic("assets/audio/land-race.wav"));
        addHeader("CARRERA TERRESTRE", "D/→ CORRER · A/← FRENAR · W/↑ SALTO · S/↓ RODAR · P PAUSA · ESC MENÚ");
        updateSelectionLabels();
        playerModes = createRunnerModes(true, 110);
        rivalModes = createRunnerModes(false, 320);
        progressLabel = addLabel(8, 38, 200, "0 / 750 KM", 7, FlxColor.WHITE);
        addLabel(12, 244, 88, "RESISTENCIA", 6, FlxColor.CYAN);
        var staminaBack = new FlxSprite(16, 258);
        staminaBack.makeGraphic(96, 5, FlxColor.fromRGB(20, 35, 48));
        add(staminaBack);
        staminaFill = new FlxSprite(18, 259);
        staminaFill.makeGraphic(92, 3, FlxColor.CYAN);
        add(staminaFill);
        resultLabel = addLabel(48, 118, 384, "", 12, FlxColor.YELLOW);
    }

    function updateSelectionLabels():Void
    {
        if (mapAssets.length == 0)
        {
            status.text = "SIN MAPAS EN MINIGAMES/TERRESTRIAL";
            detail.text = "AGREGÁ UNA IMAGEN A LA CARPETA PARA HABILITAR ESCENARIOS";
            return;
        }

        var mapName = displayMapName(mapAssets[mapIndex], "terrestrial");
        status.text = "MAPA: " + mapName + " (" + (mapIndex + 1) + "/" + mapAssets.length + ")";
        detail.text = "↑/↓ MAPA · ←/→ DISTANCIA: " + Math.round(finishDistance / 1000)
            + " KM · ENTER COMENZAR";
    }

    function createRunnerModes(isPlayer:Bool, x:Float):Map<String, FlxSprite>
    {
        var prefix = isPlayer ? "axem-orange-" : "axem-red-";
        var actions = isPlayer
            ? ["idle", "walk", "run", "dash", "jump", "roll"]
            : ["idle", "walk", "run", "dash"];
        var result = new Map<String, FlxSprite>();
        for (action in actions)
        {
            var assetPath = "assets/races/" + prefix + action + ".png";
            // Las acciones se cargan solo cuando el GIF fuente existe y el
            // generador lo incluyó en el proyecto HaxeFlixel.
            if (!Assets.exists(assetPath)) continue;
            var sprite = loadAnimatedSprite(
                assetPath,
                x,
                166,
                150,
                100,
                action,
                10
            );
            sprite.scale.set(isPlayer ? 0.56 : 0.54, isPlayer ? 0.56 : 0.54);
            sprite.updateHitbox();
            sprite.visible = action == "idle";
            result.set(action, sprite);
        }
        return result;
    }

    function resolvePlayerMode(requestedMode:String):String
    {
        if (playerModes.exists(requestedMode)) return requestedMode;
        // Orange todavía no tiene un walk.gif dedicado: se usa run como
        // sustituto hasta que se incorpore esa animación.
        if (requestedMode == "walk" && playerModes.exists("run")) return "run";
        return "idle";
    }

    function beginPlayerAction(mode:String):Void
    {
        var sprite = playerModes.get(mode);
        if (sprite == null) return;
        sprite.animation.play(mode, true);
        playerActionMode = mode;
        playerActionMs = Math.max(350, sprite.numFrames * 100);
    }

    function syncRunnerModes(
        modes:Map<String, FlxSprite>,
        activeMode:String,
        x:Float,
        y:Float
    ):Void
    {
        for (mode in modes.keys())
        {
            var sprite = modes.get(mode);
            if (sprite == null) continue;
            sprite.visible = mode == activeMode;
            sprite.x = x;
            sprite.y = y;
        }
    }

    override public function update(elapsed:Float):Void
    {
        super.update(elapsed);
        if (commonInput()) return;
        if (!started)
        {
            var mapChanged = false;
            if (mapAssets.length > 0 && FlxG.keys.justPressed.UP)
            {
                mapIndex = (mapIndex + mapAssets.length - 1) % mapAssets.length;
                mapChanged = true;
            }
            else if (mapAssets.length > 0 && FlxG.keys.justPressed.DOWN)
            {
                mapIndex = (mapIndex + 1) % mapAssets.length;
                mapChanged = true;
            }

            if (FlxG.keys.justPressed.LEFT || FlxG.keys.justPressed.RIGHT)
                distanceIndex = 1 - distanceIndex;

            finishDistance = DISTANCES[distanceIndex];
            if (mapChanged) addBackground(mapAssets[mapIndex]);
            updateSelectionLabels();

            if (FlxG.keys.justPressed.ENTER && mapAssets.length > 0)
            {
                started = true;
                countdown = 3;
                status.text = "3";
                detail.text = "PREPARADOS...";
            }
            return;
        }
        if (finished)
        {
            if (FlxG.keys.justPressed.R) FlxG.resetState();
            if (FlxG.keys.justPressed.ENTER) exitToMenu();
            return;
        }
        if (countdown > 0)
        {
            countdown = Math.max(0, countdown - elapsed);
            status.text = countdown > 0 ? Std.string(Math.ceil(countdown)) : "¡YA!";
            return;
        }

        var accelerate = FlxG.keys.pressed.D || FlxG.keys.pressed.RIGHT;
        var brake = FlxG.keys.pressed.A || FlxG.keys.pressed.LEFT;
        var playerSpeed:Float;
        if (accelerate && !brake && stamina > 0)
        {
            playerSpeed = 208;
            stamina = Math.max(0, stamina - 29 * elapsed);
        }
        else
        {
            playerSpeed = brake ? 88 : 143;
            stamina = Math.min(MAX_STAMINA, stamina + 21 * elapsed);
        }

        var rivalSpeed = 164 + Math.sin(playerDistance / 510) * 5;
        playerDistance = Math.min(finishDistance, playerDistance + playerSpeed * elapsed);
        rivalDistance = Math.min(finishDistance, rivalDistance + rivalSpeed * elapsed);
        scrollBackground(playerDistance, 0.14);
        var playerMode = brake
            ? "idle"
            : (accelerate ? (stamina > 0 ? "dash" : "run") : "walk");

        if (brake)
        {
            // Frenar siempre fuerza idle, incluso si estaba reproduciéndose
            // una animación temporal de salto o rodada.
            playerActionMode = "";
            playerActionMs = 0;
        }
        else
        {
            if (playerActionMs <= 0)
            {
                if (FlxG.keys.justPressed.W || FlxG.keys.justPressed.UP)
                    beginPlayerAction("jump");
                else if (FlxG.keys.justPressed.S || FlxG.keys.justPressed.DOWN)
                    beginPlayerAction("roll");
            }
            if (playerActionMs > 0)
            {
                playerActionMs = Math.max(0, playerActionMs - elapsed * 1000);
                if (playerActionMs > 0) playerMode = playerActionMode;
                else playerActionMode = "";
            }
        }
        playerMode = resolvePlayerMode(playerMode);

        var playerX = 112 + Math.sin(playerDistance / 20) * 2;
        var rivalX = 310 + Math.sin(rivalDistance / 20 + 1) * 2;
        syncRunnerModes(playerModes, playerMode, playerX, 166);
        syncRunnerModes(rivalModes, "run", rivalX, 166);
        staminaFill.scale.x = Math.max(0.01, stamina / MAX_STAMINA);
        staminaFill.updateHitbox();
        progressLabel.text = Math.round(playerDistance / 100) / 10 + " / " + Math.round(finishDistance / 1000) + " KM";

        if (playerDistance >= finishDistance || rivalDistance >= finishDistance)
        {
            finished = true;
            var won = playerDistance >= rivalDistance;
            status.text = won ? "¡J1 GANA LA CARRERA!" : "¡GANA AXEM RED!";
            detail.text = "R PARA REPETIR · ENTER / ESC PARA VOLVER AL MENÚ";
            resultLabel.text = won ? "LLEGASTE PRIMERO" : "EL RIVAL CRUZÓ ANTES";
        }
    }
}
