package;

import flixel.FlxG;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.util.FlxColor;
import openfl.utils.Assets;

class LandRaceState extends RaceBaseState
{
    static inline var FINISH_DISTANCE:Float = 5000;
    static inline var MAX_STAMINA:Float = 100;

    var playerModes:Map<String, FlxSprite>;
    var rivalModes:Map<String, FlxSprite>;
    var playerDistance:Float = 0;
    var rivalDistance:Float = 0;
    var stamina:Float = MAX_STAMINA;
    var countdown:Float = 3;
    var started:Bool = true;
    var finished:Bool = false;
    var staminaFill:FlxSprite;
    var progressLabel:FlxText;
    var resultLabel:FlxText;

    override public function create():Void
    {
        super.create();
        addBackground("assets/maps/desert.png");
        FlxG.sound.playMusic(Assets.getMusic("assets/audio/land-race.wav"));
        addHeader("CARRERA TERRESTRE", "D / → CORRER · A / ← FRENAR · P PAUSA · R REPETIR · ESC MENÚ");
        status.text = "3";
        detail.text = "PREPARADOS PARA 5 KM";
        playerModes = createRunnerModes(true, 110);
        rivalModes = createRunnerModes(false, 320);
        progressLabel = addLabel(8, 38, 200, "0 / 5 KM", 7, FlxColor.WHITE);
        addLabel(12, 244, 88, "RESISTENCIA", 6, FlxColor.CYAN);
        var staminaBack = new FlxSprite(16, 258);
        staminaBack.makeGraphic(96, 5, FlxColor.fromRGB(20, 35, 48));
        add(staminaBack);
        staminaFill = new FlxSprite(18, 259);
        staminaFill.makeGraphic(92, 3, FlxColor.CYAN);
        add(staminaFill);
        resultLabel = addLabel(48, 118, 384, "", 12, FlxColor.YELLOW);
    }

    function createRunnerModes(isPlayer:Bool, x:Float):Map<String, FlxSprite>
    {
        var prefix = isPlayer ? "axem-orange-" : "axem-red-";
        var specs:Array<{ mode:String, action:String, fps:Int }> = isPlayer
            ? [
                { mode: "idle", action: "idle", fps: 10 },
                { mode: "walk", action: "run", fps: 10 },
                { mode: "run", action: "run", fps: 10 },
                { mode: "dash", action: "dash", fps: 10 }
            ]
            : [
                { mode: "idle", action: "idle", fps: 10 },
                { mode: "walk", action: "walk", fps: 10 },
                { mode: "run", action: "run", fps: 10 },
                { mode: "dash", action: "dash", fps: 10 }
            ];
        var result = new Map<String, FlxSprite>();
        for (spec in specs)
        {
            var sprite = loadAnimatedSprite(
                "assets/races/" + prefix + spec.action + ".png",
                x,
                166,
                150,
                100,
                spec.mode,
                spec.fps
            );
            sprite.scale.set(isPlayer ? 0.56 : 0.54, isPlayer ? 0.56 : 0.54);
            sprite.updateHitbox();
            sprite.visible = spec.mode == "idle";
            result.set(spec.mode, sprite);
        }
        return result;
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
        playerDistance = Math.min(FINISH_DISTANCE, playerDistance + playerSpeed * elapsed);
        rivalDistance = Math.min(FINISH_DISTANCE, rivalDistance + rivalSpeed * elapsed);
        scrollBackground(playerDistance, 0.14);
        var playerMode = accelerate && !brake && stamina > 0 ? "dash" : (brake ? "walk" : "run");
        var playerX = 112 + Math.sin(playerDistance / 20) * 2;
        var rivalX = 310 + Math.sin(rivalDistance / 20 + 1) * 2;
        syncRunnerModes(playerModes, playerMode, playerX, 166);
        syncRunnerModes(rivalModes, "run", rivalX, 166);
        staminaFill.scale.x = Math.max(0.01, stamina / MAX_STAMINA);
        staminaFill.updateHitbox();
        progressLabel.text = Math.round(playerDistance / 100) / 10 + " / 5 KM";

        if (playerDistance >= FINISH_DISTANCE || rivalDistance >= FINISH_DISTANCE)
        {
            finished = true;
            var won = playerDistance >= rivalDistance;
            status.text = won ? "¡J1 GANA LA CARRERA!" : "¡GANA AXEM RED!";
            detail.text = "R PARA REPETIR · ENTER / ESC PARA VOLVER AL MENÚ";
            resultLabel.text = won ? "LLEGASTE PRIMERO" : "EL RIVAL CRUZÓ ANTES";
        }
    }
}
