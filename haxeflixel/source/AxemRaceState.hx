package;

import flixel.FlxG;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.util.FlxColor;
import openfl.utils.Assets;

typedef RacePickup = {
    var distance:Float;
    var lane:Int;
    var kind:String;
    var sprite:FlxSprite;
    var active:Bool;
}

class AxemRaceState extends RaceBaseState
{
    static inline var PLAYER_X:Float = 126;
    static inline var TRACK_SCALE:Float = 0.14;
    static inline var PLAYER_BASE_SPEED:Float = 172;
    static inline var NITRO_SPEED:Float = 135;
    static inline var LATERAL_SPEED:Float = 280;
    static inline var LANE_SWITCH_MS:Float = 145;
    static final DISTANCES:Array<Int> = [7000, 25000];
    static final LANE_Y:Array<Float> = [173, 233];

    var player:FlxSprite;
    var opponent:FlxSprite;
    var opponentUp:FlxSprite;
    var opponentDown:FlxSprite;
    var bikeShootEffect:FlxSprite;
    var bikeSpecialShootEffect:FlxSprite;
    var bikeShootEffectMs:Float = 0;
    var pickups:Array<RacePickup> = [];
    var playerDistance:Float = 0;
    var opponentDistance:Float = 0;
    var raceTimeMs:Float = 0;
    var playerLane:Int = 0;
    var playerTargetLane:Int = 0;
    var playerLaneSwitchMs:Float = 0;
    var opponentLane:Int = 1;
    var opponentFromLane:Int = 1;
    var opponentTargetLane:Int = 1;
    var opponentLaneSwitchMs:Float = 0;
    var opponentLaneTimer:Float = 2200;
    var playerOffset:Float = 0;
    var distanceIndex:Int = 0;
    var finishDistance:Float = 7000;
    var countdown:Float = 3;
    var speed:Float = PLAYER_BASE_SPEED;
    var nitro:Float = 100;
    var pickupEffect:Float = 0;
    var pickupEffectMs:Float = 0;
    var started:Bool = false;
    var finished:Bool = false;
    var playerWon:Bool = false;
    var progressLabel:FlxText;
    var nitroLabel:FlxText;
    var resultLabel:FlxText;

    override public function create():Void
    {
        super.create();
        addBackground("assets/maps/castle.png");
        FlxG.sound.playMusic(Assets.getMusic("assets/audio/axem-race.wav"));
        addHeader("CARRERA AXEM", "D ACELERAR · A FRENAR · N NITRO · ↑/↓ CARRIL · ←/→ MOVER · P PAUSA · ESC MENÚ");
        status.text = "ELEGÍ LA DISTANCIA";
        detail.text = "↑/↓ CAMBIAR · ENTER COMENZAR · 7 KM / 25 KM";
        progressLabel = addLabel(8, 38, 160, "0 / 7 KM", 7, FlxColor.WHITE);
        nitroLabel = addLabel(312, 38, 160, "NITRO 100%", 7, FlxColor.CYAN);
        resultLabel = addLabel(50, 118, 380, "", 12, FlxColor.YELLOW);

        player = loadAnimatedSprite("assets/races/axem-orange-bike.png", PLAYER_X, LANE_Y[0],
            150, 100, "bike", 10);
        opponent = loadAnimatedSprite("assets/races/axem-red-bike.png", PLAYER_X, LANE_Y[1],
            150, 100, "ride", 10);
        opponentUp = loadAnimatedSprite("assets/races/axem-red-bike-up.png", PLAYER_X, LANE_Y[1],
            150, 100, "up", 10);
        opponentDown = loadAnimatedSprite("assets/races/axem-red-bike-down.png", PLAYER_X, LANE_Y[1],
            150, 100, "down", 10);
        opponentUp.visible = false;
        opponentDown.visible = false;

        bikeShootEffect = loadAnimatedSprite("assets/races/bike-shoot.png", 0, 0,
            150, 100, "shoot", 14);
        bikeSpecialShootEffect = loadAnimatedSprite("assets/races/bike-special-shoot.png", 0, 0,
            150, 100, "special-shoot", 14);
        bikeShootEffect.scale.set(0.30, 0.30);
        bikeSpecialShootEffect.scale.set(0.34, 0.34);
        bikeShootEffect.visible = false;
        bikeSpecialShootEffect.visible = false;

        player.scale.set(0.56, 0.56);
        opponent.scale.set(0.56, 0.56);
        opponentUp.scale.set(0.56, 0.56);
        opponentDown.scale.set(0.56, 0.56);
        player.updateHitbox();
        opponent.updateHitbox();
        opponentUp.updateHitbox();
        opponentDown.updateHitbox();

        var cycles:Int = Std.int(Math.ceil(25000 / 3400)) + 1;
        for (cycle in 0...cycles)
        {
            var offset:Float = cycle * 3400;
            addPickup(offset + 280, "boost", 0);
            addPickup(offset + 840, "slow", 1);
            addPickup(offset + 1380, "boost", 1);
            addPickup(offset + 1940, "boost", 0);
            addPickup(offset + 2500, "slow", 1);
            addPickup(offset + 3100, "boost", 1);
        }
    }

    function addPickup(distance:Float, kind:String, lane:Int):Void
    {
        var pickup:FlxSprite;
        if (kind == "slow")
        {
            // Una moto sin piloto funciona como obstáculo visual para los impulsos negativos.
            pickup = loadAnimatedSprite("assets/races/unpiloted-bike.png", 0, 0,
                150, 100, "unpiloted", 9);
            pickup.scale.set(0.24, 0.24);
            pickup.updateHitbox();
        }
        else
        {
            pickup = new FlxSprite(0, 0);
            pickup.makeGraphic(18, 18, 0xFFFFB347);
            pickup.updateHitbox();
            pickup.antialiasing = false;
            add(pickup);
        }
        pickup.visible = false;
        pickups.push({
            distance: distance,
            lane: lane,
            kind: kind,
            sprite: pickup,
            active: distance < finishDistance - 80
        });
    }

    override public function update(elapsed:Float):Void
    {
        super.update(elapsed);
        if (commonInput()) return;

        if (!started)
        {
            if (FlxG.keys.justPressed.UP || FlxG.keys.justPressed.DOWN)
                distanceIndex = 1 - distanceIndex;
            finishDistance = DISTANCES[distanceIndex];
            status.text = "DISTANCIA: " + Math.round(finishDistance / 1000) + " KM";
            for (pickup in pickups) pickup.active = pickup.distance < finishDistance - 80;
            if (FlxG.keys.justPressed.ENTER)
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

        raceTimeMs += elapsed * 1000;
        var frame = Math.min(elapsed, 0.05);
        var accelerate = FlxG.keys.pressed.D;
        var brake = FlxG.keys.pressed.A;
        var boosting = FlxG.keys.pressed.N && nitro > 0;
        var steering = (FlxG.keys.pressed.RIGHT ? 1 : 0) - (FlxG.keys.pressed.LEFT ? 1 : 0);

        if (FlxG.keys.justPressed.UP) changeLane(-1);
        if (FlxG.keys.justPressed.DOWN) changeLane(1);
        playerLaneSwitchMs = Math.max(0, playerLaneSwitchMs - elapsed * 1000);
        if (playerLaneSwitchMs == 0) playerLane = playerTargetLane;

        nitro = clamp(nitro + (boosting ? -34 : 16) * frame, 0, 100);
        pickupEffectMs = Math.max(0, pickupEffectMs - elapsed * 1000);
        if (pickupEffectMs == 0) pickupEffect = 0;
        bikeShootEffectMs = Math.max(0, bikeShootEffectMs - elapsed * 1000);
        if (bikeShootEffectMs == 0) bikeShootEffect.visible = false;

        var targetSpeed = clamp(172 + (accelerate ? 100 : 0) - (brake ? 70 : 0)
            + (boosting ? NITRO_SPEED : 0) + pickupEffect, 85, 410);
        speed += (targetSpeed - speed) * Math.min(1, frame * 3.2);
        playerOffset = clamp(playerOffset + steering * LATERAL_SPEED * elapsed, -78, 78);
        playerDistance += speed * frame;
        opponentDistance += (196 + Math.sin(raceTimeMs / 390) * 15) * frame;
        scrollBackground(playerDistance, TRACK_SCALE);

        var playerX = clamp(PLAYER_X + playerOffset, 48, 432);
        player.x = playerX;
        var laneProgress = playerLaneSwitchMs > 0 ? 1 - playerLaneSwitchMs / LANE_SWITCH_MS : 1;
        var fromLane = playerLaneSwitchMs > 0 ? 1 - playerTargetLane : playerLane;
        player.y = LANE_Y[fromLane] + (LANE_Y[playerTargetLane] - LANE_Y[fromLane]) * laneProgress;

        if (boosting)
        {
            bikeSpecialShootEffect.visible = true;
            bikeSpecialShootEffect.x = playerX + 42;
            bikeSpecialShootEffect.y = player.y + 8;
        }
        else
        {
            bikeSpecialShootEffect.visible = false;
        }

        var opponentX = clamp(PLAYER_X + (opponentDistance - playerDistance) * TRACK_SCALE
            + Math.sin(raceTimeMs / 520) * 28, 48, 432);
        updateOpponentLane(frame, opponentX);

        updatePickups(playerX);
        progressLabel.text = Math.round(playerDistance / 100) / 10 + " / " + Math.round(finishDistance / 1000) + " KM";
        nitroLabel.text = "NITRO " + Math.round(nitro) + "%";

        if (playerDistance >= finishDistance || opponentDistance >= finishDistance)
        {
            finished = true;
            playerWon = playerDistance >= opponentDistance;
            showResult();
        }
    }

    function updateOpponentLane(frame:Float, opponentX:Float):Void
    {
        if (opponentLaneSwitchMs <= 0)
        {
            opponentLaneTimer -= frame * 1000;
            if (opponentLaneTimer <= 0)
            {
                opponentFromLane = opponentLane;
                opponentTargetLane = 1 - opponentLane;
                opponentLaneSwitchMs = LANE_SWITCH_MS;
                opponentLaneTimer = 2700 + Math.abs(Math.sin(raceTimeMs / 730)) * 1300;
            }
        }

        var opponentY = LANE_Y[opponentLane];
        var activeOpponent = opponent;
        if (opponentLaneSwitchMs > 0)
        {
            var laneProgress = 1 - opponentLaneSwitchMs / LANE_SWITCH_MS;
            opponentY = LANE_Y[opponentFromLane]
                + (LANE_Y[opponentTargetLane] - LANE_Y[opponentFromLane]) * laneProgress;
            activeOpponent = opponentTargetLane < opponentFromLane ? opponentUp : opponentDown;
            opponentLaneSwitchMs = Math.max(0, opponentLaneSwitchMs - frame * 1000);
            if (opponentLaneSwitchMs == 0) opponentLane = opponentTargetLane;
        }

        opponent.visible = activeOpponent == opponent;
        opponentUp.visible = activeOpponent == opponentUp;
        opponentDown.visible = activeOpponent == opponentDown;
        activeOpponent.x = opponentX;
        activeOpponent.y = opponentY;
    }

    function changeLane(direction:Int):Void
    {
        if (playerLaneSwitchMs > 0) return;
        playerTargetLane = Std.int(clamp(playerLane + direction, 0, 1));
        if (playerTargetLane != playerLane) playerLaneSwitchMs = LANE_SWITCH_MS;
    }

    function updatePickups(playerX:Float):Void
    {
        for (pickup in pickups)
        {
            var x = PLAYER_X + (pickup.distance - playerDistance) * TRACK_SCALE;
            pickup.sprite.x = pickup.kind == "slow" ? x - 18 : x;
            pickup.sprite.y = pickup.kind == "slow"
                ? LANE_Y[pickup.lane] - 12
                : LANE_Y[pickup.lane] - 9;
            pickup.sprite.visible = pickup.active && x > -34 && x < 514;
            if (pickup.active && pickup.lane == playerLane && Math.abs(x - playerX) < 18)
            {
                pickup.active = false;
                pickup.sprite.visible = false;
                pickupEffect = pickup.kind == "boost" ? 105 : -75;
                pickupEffectMs = 1900;
                if (pickup.kind == "boost")
                {
                    nitro = clamp(nitro + 24, 0, 100);
                    bikeShootEffect.x = playerX + 42;
                    bikeShootEffect.y = player.y + 8;
                    bikeShootEffect.visible = true;
                    bikeShootEffectMs = 420;
                }
            }
        }
    }

    function showResult():Void
    {
        bikeShootEffect.visible = false;
        bikeSpecialShootEffect.visible = false;
        status.text = playerWon ? "¡GANASTE LA CARRERA!" : "¡GANA AXEM RED!";
        detail.text = "R PARA REPETIR · ENTER / ESC PARA VOLVER AL MENÚ";
        resultLabel.text = playerWon ? "1.º · AXEM NARANJA" : "INTENTÁ OTRA VEZ";
    }
}
