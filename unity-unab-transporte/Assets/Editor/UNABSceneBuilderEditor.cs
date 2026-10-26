#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace UNAB.Transporte3D.EditorTools
{
    public static class UNABSceneBuilderEditor
    {
        private static Shader activeShader;

        [MenuItem("UNAB Transporte/Construir Escena 3D Completa (1-Click)", false, 1)]
        public static void BuildCompleteScene()
        {
            // Detectar automaticamente si el proyecto usa URP (Unity 6 default) o Standard
            activeShader = Shader.Find("Universal Render Pipeline/Lit");
            if (activeShader == null) activeShader = Shader.Find("Standard");

            GameObject existing = GameObject.Find("UNAB_Transporte_Root");
            if (existing != null) Object.DestroyImmediate(existing);

            GameObject root = new GameObject("UNAB_Transporte_Root");
            Undo.RegisterCreatedObjectUndo(root, "Build UNAB Transporte 3D Scene");

            var sim = root.AddComponent<UNABNetworkSimulator>();
            sim.InitializeDatabase();

            var ctrl = root.AddComponent<UNABSceneController>();
            root.AddComponent<UNABHudAndConsoleUI>();

            // Configurar Camara Principal e Iluminacion
            Camera mainCam = Camera.main;
            if (mainCam == null)
            {
                GameObject camObj = new GameObject("Main Camera");
                camObj.tag = "MainCamera";
                mainCam = camObj.AddComponent<Camera>();
                camObj.AddComponent<AudioListener>();
            }
            mainCam.clearFlags = CameraClearFlags.SolidColor;
            mainCam.backgroundColor = new Color(0.055f, 0.09f, 0.16f);
            mainCam.nearClipPlane = 0.1f;
            mainCam.farClipPlane = 180f;
            mainCam.fieldOfView = 52f;
            ctrl.mainCamera = mainCam;

            SetupLightingAndReflections(root.transform);

            // Construir Arquitectura, Techo, Equipos y Cableado
            BuildEnvironmentAndWalls(root.transform, ctrl);
            BuildSuspendedCeiling(root.transform, ctrl);
            BuildDataCenterRoom(root.transform, ctrl);
            BuildMonitoringOffice(root.transform, ctrl);
            BuildStructuredCabling(root.transform, ctrl);

            Selection.activeGameObject = root;
            SceneView.RepaintAll();
            EditorUtility.DisplayDialog(
                "UNAB - Area de Transporte 3D",
                "¡Escena 3D construida con exito!\n\nPresiona el boton PLAY (▶) arriba al centro en Unity para caminar con WASD, abrir la consola estilo Cisco Packet Tracer con la tecla F y usar las vistas rapidas.",
                "¡Listo!");
        }

        private static Material CreatePbrMat(string name, Color color, float metallic = 0.05f, float smoothness = 0.5f, Texture2D tex = null, bool transparent = false, Color? emission = null)
        {
            Material m = new Material(activeShader) { name = name };
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", color);
            if (m.HasProperty("_Color")) m.SetColor("_Color", color);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metallic);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);

            if (tex != null)
            {
                if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
                if (m.HasProperty("_MainTex")) m.SetTexture("_MainTex", tex);
            }

            if (transparent)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f); // URP Transparent
                m.SetOverrideTag("RenderType", "Transparent");
                m.renderQueue = (int)RenderQueue.Transparent;
                if (m.HasProperty("_SrcBlend")) m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
                if (m.HasProperty("_DstBlend")) m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                if (m.HasProperty("_ZWrite")) m.SetInt("_ZWrite", 0);
            }

            if (emission.HasValue)
            {
                m.EnableKeyword("_EMISSION");
                if (m.HasProperty("_EmissionColor")) m.SetColor("_EmissionColor", emission.Value);
            }
            return m;
        }

        private static GameObject AddBox(Transform parent, string name, Vector3 pos, Vector3 size, Material mat, bool withCollider = true)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = size;
            var r = go.GetComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            if (!withCollider)
            {
                var c = go.GetComponent<Collider>();
                if (c != null) Object.DestroyImmediate(c);
            }
            return go;
        }

        private static void TagInteractable(GameObject go, string key)
        {
            var tag = go.AddComponent<UNABInteractableTag>();
            tag.dataKey = key;
        }

        private static void AddLabel(UNABSceneController ctrl, string text, Vector3 pos)
        {
            ctrl.floatingLabels.Add(new FloatingLabelRef { text = text, worldPosition = pos });
        }

        private static void SetupLightingAndReflections(Transform root)
        {
            GameObject lightGroup = new GameObject("Lighting_And_Probes");
            lightGroup.transform.SetParent(root, false);

            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.75f, 0.82f, 0.92f);
            RenderSettings.ambientEquatorColor = new Color(0.55f, 0.62f, 0.72f);
            RenderSettings.ambientGroundColor = new Color(0.25f, 0.28f, 0.34f);

            Light dirLight = Object.FindFirstObjectByType<Light>();
            if (dirLight == null || dirLight.type != LightType.Directional)
            {
                GameObject dlObj = new GameObject("Sun_DirectionalLight");
                dlObj.transform.SetParent(lightGroup.transform, false);
                dirLight = dlObj.AddComponent<Light>();
                dirLight.type = LightType.Directional;
            }
            dirLight.transform.rotation = Quaternion.Euler(48f, -38f, 0f);
            dirLight.intensity = 1.25f;
            dirLight.color = new Color(1f, 0.98f, 0.94f);
            dirLight.shadows = LightShadows.Soft;

            // Luz azul tecnica junto al Rack Principal
            GameObject rackLightObj = new GameObject("Rack_BluePointLight");
            rackLightObj.transform.SetParent(lightGroup.transform, false);
            rackLightObj.transform.localPosition = new Vector3(-6.1f, 1.8f, -0.2f);
            Light rl = rackLightObj.AddComponent<Light>();
            rl.type = LightType.Point;
            rl.color = new Color(0.22f, 0.58f, 0.98f);
            rl.intensity = 2.4f;
            rl.range = 6.5f;

            // Luz calida interior oficina de monitoreo
            GameObject offLightObj = new GameObject("Office_InteriorLight");
            offLightObj.transform.SetParent(lightGroup.transform, false);
            offLightObj.transform.localPosition = new Vector3(2.4f, 2.85f, 0f);
            Light ol = offLightObj.AddComponent<Light>();
            ol.type = LightType.Point;
            ol.color = new Color(0.98f, 0.98f, 1f);
            ol.intensity = 1.8f;
            ol.range = 16f;

            // Reflection Probe para que el vidrio reflectivo UNAB y el rack metalico tengan reflejos reales
            GameObject probeObj = new GameObject("Room_ReflectionProbe");
            probeObj.transform.SetParent(lightGroup.transform, false);
            probeObj.transform.localPosition = new Vector3(0f, 1.8f, 0f);
            ReflectionProbe probe = probeObj.AddComponent<ReflectionProbe>();
            probe.mode = ReflectionProbeMode.Realtime;
            probe.refreshMode = ReflectionProbeRefreshMode.OnAwake;
            probe.boxProjection = true;
            probe.size = new Vector3(20f, 6f, 15f);
        }

        // Nota: Z en Unity es invertida respecto a Three.js (-zThree) para conservar izquierda/derecha intactas
        private static void BuildEnvironmentAndWalls(Transform root, UNABSceneController ctrl)
        {
            GameObject env = new GameObject("Architecture_And_Walls");
            env.transform.SetParent(root, false);

            Material grassMat = CreatePbrMat("Grass", new Color(0.35f, 0.58f, 0.08f), 0f, 0.15f);
            AddBox(env.transform, "Exterior_Grass", new Vector3(0f, -0.08f, 0f), new Vector3(48f, 0.08f, 38f), grassMat, false);

            Material dcFloorMat = CreatePbrMat("RaisedFloor_DC", new Color(0.14f, 0.17f, 0.21f), 0.35f, 0.65f, MakeGridTex(new Color(0.13f, 0.16f, 0.2f), new Color(0.06f, 0.08f, 0.1f)));
            AddBox(env.transform, "DataCenter_RaisedFloor", new Vector3(-5.6f, 0.08f, 0f), new Vector3(4.8f, 0.16f, 11.0f), dcFloorMat);

            Material offFloorMat = CreatePbrMat("OfficeTiles", new Color(0.90f, 0.86f, 0.78f), 0.05f, 0.72f, MakeGridTex(new Color(0.91f, 0.87f, 0.79f), new Color(0.78f, 0.73f, 0.64f)));
            AddBox(env.transform, "Office_TileFloor", new Vector3(2.4f, 0.06f, 0f), new Vector3(11.2f, 0.12f, 11.0f), offFloorMat);

            Material wallWhiteMat = CreatePbrMat("Wall_White", new Color(0.97f, 0.98f, 0.99f), 0.02f, 0.45f);
            Material trimBlackMat = CreatePbrMat("Trim_Black", new Color(0.07f, 0.09f, 0.13f), 0.4f, 0.65f);
            Material glassBlueMat = CreatePbrMat("Glass_Reflective_UNAB", new Color(0.22f, 0.65f, 0.94f, 0.62f), 0.85f, 0.95f, null, true, new Color(0.03f, 0.12f, 0.22f));

            float wallH = 3.6f;
            float wallT = 0.24f;

            void AddSolidWall(float x, float zThree, float w, float d)
            {
                float z = -zThree;
                GameObject wg = new GameObject($"Wall_{x}_{z}");
                wg.transform.SetParent(env.transform, false);
                wg.transform.localPosition = new Vector3(x, 0f, z);
                AddBox(wg.transform, "Body", new Vector3(0f, wallH * 0.5f, 0f), new Vector3(w, wallH, d), wallWhiteMat);
                AddBox(wg.transform, "TopCap", new Vector3(0f, wallH + 0.04f, 0f), new Vector3(w + 0.02f, 0.08f, d + 0.02f), trimBlackMat, false);
                AddBox(wg.transform, "Baseboard", new Vector3(0f, 0.14f, 0f), new Vector3(w + 0.03f, 0.12f, d + 0.03f), trimBlackMat, false);
                ctrl.wallGroups.Add(wg.transform);
            }

            void AddCurtainGlassWall(float x, float zThree, float length, bool alongZ)
            {
                float z = -zThree;
                float w = alongZ ? wallT : length;
                float d = alongZ ? length : wallT;

                GameObject wg = new GameObject($"ReflectiveGlassWall_{x}_{z}");
                wg.transform.SetParent(env.transform, false);
                wg.transform.localPosition = new Vector3(x, 0f, z);

                AddBox(wg.transform, "LowWall", new Vector3(0f, 0.21f, 0f), new Vector3(w, 0.42f, d), wallWhiteMat);
                AddBox(wg.transform, "TopHeader", new Vector3(0f, 3.39f, 0f), new Vector3(w, 0.42f, d), wallWhiteMat);
                AddBox(wg.transform, "TopCap", new Vector3(0f, wallH + 0.04f, 0f), new Vector3(w + 0.02f, 0.08f, d + 0.02f), trimBlackMat, false);

                float gw = alongZ ? 0.06f : length - 0.08f;
                float gd = alongZ ? length - 0.08f : 0.06f;
                AddBox(wg.transform, "ReflectiveGlass", new Vector3(0f, 1.8f, 0f), new Vector3(gw, 2.76f, gd), glassBlueMat);

                int cols = Mathf.Max(2, Mathf.FloorToInt(length / 0.85f));
                for (int c = 0; c <= cols; c++)
                {
                    float off = -length * 0.5f + ((float)c / cols) * length;
                    AddBox(wg.transform, "MullionV", new Vector3(alongZ ? 0f : off, 1.8f, alongZ ? off : 0f),
                        new Vector3(alongZ ? 0.12f : 0.05f, 2.78f, alongZ ? 0.05f : 0.12f), trimBlackMat, false);
                }
                float[] hHeights = { 0.42f, 1.34f, 2.26f, 3.18f };
                foreach (float hy in hHeights)
                {
                    AddBox(wg.transform, "MullionH", new Vector3(0f, hy, 0f),
                        new Vector3(alongZ ? 0.12f : length, 0.05f, alongZ ? length : 0.12f), trimBlackMat, false);
                }
                ctrl.wallGroups.Add(wg.transform);
            }

            void AddDoorwayLintel(float x, float zThree, float w, float d)
            {
                float z = -zThree;
                float headerH = 3.6f - 2.85f;
                GameObject wg = new GameObject($"DoorLintel_{x}_{z}");
                wg.transform.SetParent(env.transform, false);
                wg.transform.localPosition = new Vector3(x, 0f, z);
                AddBox(wg.transform, "HeaderBody", new Vector3(0f, 2.85f + headerH * 0.5f, 0f), new Vector3(w, headerH, d), wallWhiteMat, false);
                AddBox(wg.transform, "TopCap", new Vector3(0f, 3.64f, 0f), new Vector3(w + 0.02f, 0.08f, d + 0.02f), trimBlackMat, false);
                AddBox(wg.transform, "BottomTrim", new Vector3(0f, 2.87f, 0f), new Vector3(w + 0.02f, 0.05f, d + 0.02f), trimBlackMat, false);
                ctrl.wallGroups.Add(wg.transform);
            }

            // Perimetro y muros con tramos de vidrio reflectivo azul UNAB
            AddSolidWall(0f, -5.5f, 16.24f, wallT);
            AddSolidWall(-8.0f, 0f, wallT, 11.24f);
            AddSolidWall(-2.5f, 5.5f, 11.0f, wallT);
            AddCurtainGlassWall(4.7f, 5.5f, 3.4f, false);
            AddSolidWall(7.2f, 5.5f, 1.6f, wallT);

            // Fachada derecha con puerta doble + vidrio reflectivo
            AddCurtainGlassWall(8.0f, -3.5f, 3.3f, true);
            AddSolidWall(8.0f, -5.32f, wallT, 0.36f);
            AddCurtainGlassWall(8.0f, 3.5f, 3.3f, true);
            AddSolidWall(8.0f, 5.32f, wallT, 0.36f);
            AddDoorwayLintel(8.0f, 0f, wallT, 3.7f);

            // Muro divisor central hacia el servidor
            AddSolidWall(-3.2f, -5.0f, wallT, 1.0f);
            AddSolidWall(-3.2f, -2.5f, wallT, 1.7f);
            AddCurtainGlassWall(-3.2f, 0.3f, 3.9f, true);
            AddSolidWall(-3.2f, 3.9f, wallT, 3.3f);
            AddDoorwayLintel(-3.2f, -3.925f, wallT, 1.15f);

            // Puertas con bisagra sin z-fighting
            void AddDoorLeaf(float hx, float hzThree, float widthZ, float closedDeg, float openDeg, int hingeDir)
            {
                float hz = -hzThree;
                GameObject doorRoot = new GameObject("Door_Hinge");
                doorRoot.transform.SetParent(env.transform, false);
                doorRoot.transform.localPosition = new Vector3(hx, 0f, hz);

                float doorH = 2.82f;
                float frameW = 0.07f;
                float dir = -hingeDir; // invertido por eje Z

                AddBox(doorRoot.transform, "InnerWhite", new Vector3(0f, 0.08f + doorH * 0.5f, dir * widthZ * 0.5f),
                    new Vector3(0.055f, doorH - frameW * 2f, widthZ - frameW * 2f), wallWhiteMat, false);
                AddBox(doorRoot.transform, "TopRail", new Vector3(0f, 0.08f + doorH - frameW * 0.5f, dir * widthZ * 0.5f),
                    new Vector3(0.075f, frameW, widthZ), trimBlackMat, false);
                AddBox(doorRoot.transform, "BotRail", new Vector3(0f, 0.08f + frameW * 0.5f, dir * widthZ * 0.5f),
                    new Vector3(0.075f, frameW, widthZ), trimBlackMat, false);
                AddBox(doorRoot.transform, "StileHinge", new Vector3(0f, 0.08f + doorH * 0.5f, dir * frameW * 0.5f),
                    new Vector3(0.075f, doorH - frameW * 2f, frameW), trimBlackMat, false);
                AddBox(doorRoot.transform, "StileLatch", new Vector3(0f, 0.08f + doorH * 0.5f, dir * (widthZ - frameW * 0.5f)),
                    new Vector3(0.075f, doorH - frameW * 2f, frameW), trimBlackMat, false);
                AddBox(doorRoot.transform, "WindowGlass", new Vector3(0f, 1.75f, dir * widthZ * 0.5f),
                    new Vector3(0.085f, 1.15f, widthZ * 0.42f), glassBlueMat, false);

                doorRoot.transform.localEulerAngles = new Vector3(0f, openDeg, 0f);
                ctrl.wallGroups.Add(doorRoot.transform);
                ctrl.doorHinges.Add(new DoorHingeRef { pivot = doorRoot.transform, closedAngleY = closedDeg, openAngleY = openDeg });
            }

            AddDoorLeaf(8.0f, -1.85f, 1.82f, 0f, 68f, 1);
            AddDoorLeaf(8.0f, 1.85f, 1.82f, 0f, -68f, -1);
            AddDoorLeaf(-3.2f, -4.5f, 1.12f, 0f, -78f, 1);
        }

        private static void BuildSuspendedCeiling(Transform root, UNABSceneController ctrl)
        {
            GameObject ceil = new GameObject("Suspended_Acoustic_Ceiling");
            ceil.transform.SetParent(root, false);
            ctrl.ceilingGroup = ceil;

            Material tileMat = CreatePbrMat("AcousticCeiling", new Color(0.96f, 0.97f, 0.98f), 0f, 0.3f, MakeGridTex(new Color(0.97f, 0.98f, 0.99f), new Color(0.82f, 0.85f, 0.89f)));
            Material gridMat = CreatePbrMat("CeilingGrid", new Color(0.78f, 0.82f, 0.86f), 0.4f, 0.6f);
            Material ledMat = CreatePbrMat("CeilingLED", Color.white, 0f, 0.9f, null, false, Color.white * 1.6f);

            AddBox(ceil.transform, "AcousticSlab", new Vector3(0f, 3.16f, 0f), new Vector3(16.0f, 0.04f, 11.0f), tileMat, false);

            float[] ledCoords =
            {
                -5.6f, -3.2f,  -5.6f, 0.0f,  -5.6f, 3.2f,
                -0.6f, -3.2f,  -0.6f, 0.0f,  -0.6f, 3.2f,
                 2.8f, -3.2f,   2.8f, 0.0f,   2.8f, 3.2f,
                 6.0f, -3.2f,   6.0f, 0.0f,   6.0f, 3.2f
            };
            for (int i = 0; i < ledCoords.Length; i += 2)
            {
                float lx = ledCoords[i];
                float lz = -ledCoords[i + 1];
                AddBox(ceil.transform, "LED_Frame", new Vector3(lx, 3.112f, lz), new Vector3(1.18f, 0.016f, 0.58f), gridMat, false);
                AddBox(ceil.transform, "LED_Diffuser", new Vector3(lx, 3.101f, lz), new Vector3(1.10f, 0.01f, 0.50f), ledMat, false);
            }
        }

        private static void BuildDataCenterRoom(Transform root, UNABSceneController ctrl)
        {
            GameObject dc = new GameObject("DataCenter_Equipment");
            dc.transform.SetParent(root, false);

            Material darkMetal = CreatePbrMat("RackBlackMetal", new Color(0.08f, 0.09f, 0.11f), 0.78f, 0.68f);
            Material chassisGray = CreatePbrMat("ChassisGray", new Color(0.16f, 0.20f, 0.25f), 0.6f, 0.55f);
            Material blueLedMat = CreatePbrMat("BlueLED", new Color(0.22f, 0.58f, 0.98f), 0f, 0.9f, null, false, new Color(0.22f, 0.58f, 0.98f) * 2.2f);
            Material greenLedMat = CreatePbrMat("GreenLED", new Color(0.15f, 0.85f, 0.38f), 0f, 0.9f, null, false, new Color(0.15f, 0.85f, 0.38f) * 2f);
            Material utpBlueMat = CreatePbrMat("Cat6ABlue", new Color(0.02f, 0.52f, 0.78f), 0.1f, 0.6f);
            Material whiteMat = CreatePbrMat("RouterWhite", new Color(0.95f, 0.96f, 0.98f), 0.1f, 0.65f);
            Material lcdBlueMat = CreatePbrMat("UpsLCD220V", new Color(0.05f, 0.55f, 0.92f), 0.1f, 0.9f, null, false, new Color(0.08f, 0.62f, 0.98f) * 1.8f);

            // 1. RACK PRINCIPAL 42U ALL-IN-ONE
            GameObject rack = new GameObject("Rack_Main_42U");
            rack.transform.SetParent(dc.transform, false);
            rack.transform.localPosition = new Vector3(-6.75f, 0.16f, -0.45f);
            rack.transform.localEulerAngles = new Vector3(0f, -90f, 0f);

            AddBox(rack.transform, "Rack_Collider", new Vector3(0f, 1.15f, 0f), new Vector3(0.95f, 2.3f, 1.0f), CreatePbrMat("Invisible", Color.clear, 0, 0, null, true));
            AddBox(rack.transform, "Base", new Vector3(0f, 0.08f, 0f), new Vector3(0.92f, 0.08f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "Roof", new Vector3(0f, 2.24f, 0f), new Vector3(0.92f, 0.07f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "BackDoor", new Vector3(0f, 1.16f, -0.46f), new Vector3(0.88f, 2.12f, 0.03f), darkMetal, false);

            float[] posts = { -0.43f, -0.43f,  0.43f, -0.43f,  -0.43f, 0.43f,  0.43f, 0.43f };
            for (int i = 0; i < posts.Length; i += 2)
                AddBox(rack.transform, "Post", new Vector3(posts[i], 1.16f, posts[i + 1]), new Vector3(0.06f, 2.12f, 0.06f), darkMetal, false);

            AddBox(rack.transform, "LED_Strip_L", new Vector3(-0.39f, 1.16f, 0.44f), new Vector3(0.018f, 2.02f, 0.018f), blueLedMat, false);
            AddBox(rack.transform, "LED_Strip_R", new Vector3(0.39f, 1.16f, 0.44f), new Vector3(0.018f, 2.02f, 0.018f), blueLedMat, false);

            // Equipos internos del Rack: Patch Panels, Switches, Router blanco, Servidores, PDU
            float[] ppHeights = { 2.02f, 1.62f };
            foreach (float py in ppHeights)
            {
                AddBox(rack.transform, "PatchPanel_24P", new Vector3(0f, py, 0.34f), new Vector3(0.78f, 0.09f, 0.12f), darkMetal, false);
                AddBox(rack.transform, "CableBundle", new Vector3(0f, py - 0.05f, 0.42f), new Vector3(0.68f, 0.03f, 0.04f), utpBlueMat, false);
            }

            float[] swHeights = { 1.82f, 1.42f };
            foreach (float sy in swHeights)
            {
                AddBox(rack.transform, "Switch_24P", new Vector3(0f, sy, 0.12f), new Vector3(0.78f, 0.09f, 0.48f), chassisGray, false);
                AddBox(rack.transform, "Switch_LEDs", new Vector3(-0.18f, sy, 0.37f), new Vector3(0.32f, 0.02f, 0.01f), greenLedMat, false);
            }

            // Router Blanco con antenas sobre bandeja
            AddBox(rack.transform, "Router_Shelf", new Vector3(0f, 1.14f, 0.05f), new Vector3(0.78f, 0.025f, 0.62f), darkMetal, false);
            AddBox(rack.transform, "Router_Body", new Vector3(0f, 1.19f, 0.16f), new Vector3(0.36f, 0.065f, 0.24f), whiteMat, false);
            AddBox(rack.transform, "Antenna_L", new Vector3(-0.14f, 1.31f, 0.08f), new Vector3(0.018f, 0.22f, 0.018f), whiteMat, false);
            AddBox(rack.transform, "Antenna_R", new Vector3(0.14f, 1.31f, 0.08f), new Vector3(0.018f, 0.22f, 0.018f), whiteMat, false);

            // Servidores 1U y 4U Base de Datos
            AddBox(rack.transform, "Server_1U_App", new Vector3(0f, 0.92f, 0.02f), new Vector3(0.78f, 0.11f, 0.72f), chassisGray, false);
            AddBox(rack.transform, "Server_4U_DB", new Vector3(0f, 0.48f, 0.02f), new Vector3(0.76f, 0.34f, 0.74f), darkMetal, false);
            AddBox(rack.transform, "PDU_Power", new Vector3(0f, 0.21f, 0.28f), new Vector3(0.78f, 0.075f, 0.16f), darkMetal, false);

            TagInteractable(rack, "rack_main");
            AddLabel(ctrl, "Rack Principal de Telecomunicaciones (42U)", new Vector3(-6.75f, 2.65f, -0.45f));

            // 2. SISTEMA UPS ONLINE 220V (3 MODULOS ESCALONADOS)
            GameObject upsGroup = new GameObject("UPS_3000VA_Bank");
            upsGroup.transform.SetParent(dc.transform, false);
            upsGroup.transform.localPosition = new Vector3(-5.25f, 0.16f, -4.55f);
            upsGroup.transform.localEulerAngles = new Vector3(0f, 180f, 0f);

            AddBox(upsGroup.transform, "UPS_Collider", new Vector3(0f, 0.48f, 0f), new Vector3(1.35f, 0.96f, 0.75f), CreatePbrMat("Inv", Color.clear, 0, 0, null, true));

            (float x, float w, float h, float d)[] upsSpecs =
            {
                (-0.42f, 0.38f, 0.86f, 0.68f),
                ( 0.02f, 0.34f, 0.68f, 0.60f),
                ( 0.41f, 0.30f, 0.54f, 0.52f)
            };
            foreach (var u in upsSpecs)
            {
                AddBox(upsGroup.transform, "UPS_Tower", new Vector3(u.x, u.h * 0.5f, 0f), new Vector3(u.w, u.h, u.d), darkMetal, false);
                AddBox(upsGroup.transform, "UPS_LCD_220V", new Vector3(u.x, u.h * 0.76f, u.d * 0.5f + 0.01f), new Vector3(u.w * 0.42f, 0.10f, 0.015f), lcdBlueMat, false);
            }
            TagInteractable(upsGroup, "ups_power");
            AddLabel(ctrl, "Banco de UPS Online 220V (3000VA)", new Vector3(-5.25f, 1.32f, -4.55f));

            // 3. CLIMATIZADOR DE PRECISION EDAPOWER CRAC
            GameObject crac = new GameObject("EDApower_CRAC_Unit");
            crac.transform.SetParent(dc.transform, false);
            crac.transform.localPosition = new Vector3(-6.35f, 0.16f, 4.78f);

            AddBox(crac.transform, "Cabinet", new Vector3(0f, 1.12f, 0f), new Vector3(1.18f, 2.24f, 0.74f), darkMetal);
            AddBox(crac.transform, "HMI_Touchscreen", new Vector3(0.04f, 1.26f, -0.38f), new Vector3(0.28f, 0.20f, 0.02f), whiteMat, false);
            AddBox(crac.transform, "HMI_Graph", new Vector3(0.04f, 1.26f, -0.39f), new Vector3(0.22f, 0.14f, 0.01f), lcdBlueMat, false);

            TagInteractable(crac, "ac_unit");
            AddLabel(ctrl, "Climatizador de Precision EDApower CRAC", new Vector3(-6.35f, 2.58f, 4.78f));
        }

        private static void BuildMonitoringOffice(Transform root, UNABSceneController ctrl)
        {
            GameObject office = new GameObject("Monitoring_Office_Furniture");
            office.transform.SetParent(root, false);

            Material woodMat = CreatePbrMat("DeskWood", new Color(0.84f, 0.66f, 0.44f), 0.05f, 0.55f);
            Material legMat = CreatePbrMat("DeskMetal", new Color(0.18f, 0.22f, 0.27f), 0.7f, 0.6f);
            Material darkMat = CreatePbrMat("PCBlack", new Color(0.09f, 0.10f, 0.12f), 0.5f, 0.6f);
            Material screenMat = CreatePbrMat("GpsScreen", new Color(0.08f, 0.38f, 0.68f), 0.1f, 0.85f, null, false, new Color(0.08f, 0.45f, 0.78f) * 1.3f);
            Material whiteShelfMat = CreatePbrMat("ShelfWhite", new Color(0.95f, 0.96f, 0.98f), 0.05f, 0.5f);
            Material plantPotMat = CreatePbrMat("PotGray", new Color(0.60f, 0.64f, 0.68f), 0.3f, 0.45f);
            Material leafGreenMat = CreatePbrMat("LeafGreen", new Color(0.16f, 0.46f, 0.18f), 0.05f, 0.4f);

            void BuildDesk(float x, float zThree, float rotY, string key, string labelText)
            {
                float z = -zThree;
                GameObject d = new GameObject($"Workstation_{key}");
                d.transform.SetParent(office.transform, false);
                d.transform.localPosition = new Vector3(x, 0.12f, z);
                d.transform.localEulerAngles = new Vector3(0f, rotY, 0f);

                AddBox(d.transform, "Desk_Collider", new Vector3(0f, 0.68f, 0f), new Vector3(2.2f, 1.35f, 1.25f), CreatePbrMat("Inv", Color.clear, 0, 0, null, true));
                AddBox(d.transform, "TableTop", new Vector3(0f, 0.74f, 0f), new Vector3(2.15f, 0.06f, 1.05f), woodMat, false);

                float[] legs = { -0.98f, -0.44f,  0.98f, -0.44f,  -0.98f, 0.44f,  0.98f, 0.44f };
                for (int i = 0; i < legs.Length; i += 2)
                    AddBox(d.transform, "Leg", new Vector3(legs[i], 0.37f, legs[i + 1]), new Vector3(0.06f, 0.74f, 0.06f), legMat, false);

                // Monitor, teclado, mouse sobre mesa y PC Case en el piso
                AddBox(d.transform, "Monitor_Frame", new Vector3(0f, 1.12f, 0.18f), new Vector3(0.84f, 0.50f, 0.04f), darkMat, false);
                AddBox(d.transform, "Monitor_Screen", new Vector3(0f, 1.12f, 0.155f), new Vector3(0.78f, 0.44f, 0.01f), screenMat, false);
                AddBox(d.transform, "Monitor_Stand", new Vector3(0f, 0.85f, 0.20f), new Vector3(0.08f, 0.18f, 0.08f), darkMat, false);
                AddBox(d.transform, "Keyboard", new Vector3(-0.05f, 0.78f, -0.15f), new Vector3(0.42f, 0.02f, 0.15f), darkMat, false);
                AddBox(d.transform, "Mouse", new Vector3(0.28f, 0.78f, -0.15f), new Vector3(0.07f, 0.025f, 0.11f), darkMat, false);
                AddBox(d.transform, "PC_Tower_Floor", new Vector3(0.75f, 0.26f, 0.05f), new Vector3(0.23f, 0.50f, 0.48f), darkMat, false);

                // Silla ergonomica
                AddBox(d.transform, "Chair_Seat", new Vector3(0f, 0.46f, -0.68f), new Vector3(0.52f, 0.07f, 0.52f), darkMat, false);
                AddBox(d.transform, "Chair_Back", new Vector3(0f, 0.82f, -0.91f), new Vector3(0.50f, 0.65f, 0.07f), darkMat, false);

                TagInteractable(d, key);
                AddLabel(ctrl, labelText, new Vector3(x, 2.25f, z));
            }

            BuildDesk(0.85f, -3.85f, 0f, "pc_monitor_1", "PC Monitoreo #1 (Mapa GPS)");
            BuildDesk(5.4f, -3.85f, 0f, "pc_monitor_2", "PC Monitoreo #2 (Salidas/Llegadas)");
            BuildDesk(4.1f, 4.15f, 180f, "pc_admin", "PC Administracion de Red");

            // Impresora Epson EcoTank en Red
            GameObject prn = new GameObject("Epson_EcoTank_Printer");
            prn.transform.SetParent(office.transform, false);
            prn.transform.localPosition = new Vector3(-1.75f, 0.12f, -0.65f);

            AddBox(prn.transform, "Stand", new Vector3(0f, 0.37f, 0f), new Vector3(0.95f, 0.74f, 0.74f), CreatePbrMat("StandBeige", new Color(0.83f, 0.80f, 0.73f)));
            AddBox(prn.transform, "Body", new Vector3(-0.06f, 0.88f, 0f), new Vector3(0.58f, 0.28f, 0.46f), darkMat);
            AddBox(prn.transform, "EcoTank_Module", new Vector3(0.28f, 0.86f, 0.06f), new Vector3(0.14f, 0.24f, 0.32f), darkMat, false);
            AddBox(prn.transform, "Printed_Sheet", new Vector3(-0.06f, 0.76f, -0.34f), new Vector3(0.32f, 0.01f, 0.26f), whiteShelfMat, false);

            TagInteractable(prn, "printer_net");
            AddLabel(ctrl, "Impresora Epson EcoTank en Red", new Vector3(-1.75f, 1.55f, -0.65f));

            // Estante Blanco de 5 Niveles
            GameObject shelf = new GameObject("White_5Tier_Bookcase");
            shelf.transform.SetParent(office.transform, false);
            shelf.transform.localPosition = new Vector3(-2.72f, 0.12f, -3.55f);
            shelf.transform.localEulerAngles = new Vector3(0f, 90f, 0f);
            AddBox(shelf.transform, "Bookcase_Body", new Vector3(0f, 1.05f, 0f), new Vector3(0.92f, 2.10f, 0.36f), whiteShelfMat);

            // Macetas Altas Dracaena
            void BuildPlanter(float px, float pzThree)
            {
                GameObject pl = new GameObject("Indoor_Planter");
                pl.transform.SetParent(office.transform, false);
                pl.transform.localPosition = new Vector3(px, 0.12f, -pzThree);
                AddBox(pl.transform, "TaperedPot", new Vector3(0f, 0.38f, 0f), new Vector3(0.36f, 0.76f, 0.36f), plantPotMat);
                AddBox(pl.transform, "Foliage", new Vector3(0f, 1.15f, 0f), new Vector3(0.52f, 0.78f, 0.52f), leafGreenMat, false);
            }
            BuildPlanter(-2.6f, -1.15f);
            BuildPlanter(6.65f, 4.35f);
        }

        private static void BuildStructuredCabling(Transform root, UNABSceneController ctrl)
        {
            GameObject cab = new GameObject("Structured_Cabling_Cat6A");
            cab.transform.SetParent(root, false);

            Material trayMat = CreatePbrMat("LadderTray", new Color(0.28f, 0.33f, 0.40f), 0.75f, 0.6f);
            Material pvcMat = CreatePbrMat("WallTrunkingPVC", new Color(0.84f, 0.87f, 0.91f), 0.1f, 0.55f);
            Material cableMat = CreatePbrMat("CableCat6A", new Color(0.02f, 0.52f, 0.78f), 0.1f, 0.65f, null, false, new Color(0.01f, 0.25f, 0.42f));
            Material packetMat = CreatePbrMat("DataPacket", new Color(0.22f, 0.74f, 0.98f), 0f, 0.9f, null, false, new Color(0.22f, 0.74f, 0.98f) * 2.5f);

            // Bandejas tipo escalerilla en el plenum sobre el falso techo (Y = 3.32m)
            AddBox(cab.transform, "Tray_West", new Vector3(-7.65f, 3.32f, 0.3f), new Vector3(0.38f, 0.04f, 9.7f), trayMat, false);
            AddBox(cab.transform, "Tray_North", new Vector3(-0.55f, 3.32f, 5.15f), new Vector3(14.2f, 0.04f, 0.38f), trayMat, false);
            AddBox(cab.transform, "Tray_Partition", new Vector3(-3.02f, 3.32f, 0f), new Vector3(0.36f, 0.04f, 10.3f), trayMat, false);
            AddBox(cab.transform, "Tray_South", new Vector3(0.6f, 3.32f, -5.15f), new Vector3(7.3f, 0.04f, 0.36f), trayMat, false);

            // Canaletas verticales en pared
            AddBox(cab.transform, "Trunk_RackWall", new Vector3(-7.83f, 1.85f, -0.45f), new Vector3(0.08f, 2.95f, 0.26f), pvcMat, false);
            AddBox(cab.transform, "Drop_PC1", new Vector3(1.8f, 1.88f, 5.34f), new Vector3(0.10f, 2.90f, 0.06f), pvcMat, false);
            AddBox(cab.transform, "Drop_PC2", new Vector3(6.35f, 1.88f, 5.34f), new Vector3(0.10f, 2.90f, 0.06f), pvcMat, false);
            AddBox(cab.transform, "Drop_Printer", new Vector3(-3.04f, 1.88f, 0.8f), new Vector3(0.06f, 2.90f, 0.10f), pvcMat, false);
            AddBox(cab.transform, "Drop_PCAdmin", new Vector3(3.15f, 1.88f, -5.34f), new Vector3(0.10f, 2.90f, 0.06f), pvcMat, false);

            Vector3[][] routes =
            {
                new[] {
                    new Vector3(-7.35f, 1.8f, -0.38f), new Vector3(-7.8f, 1.8f, -0.38f), new Vector3(-7.8f, 3.35f, -0.38f),
                    new Vector3(-7.68f, 3.35f, 5.12f), new Vector3(1.8f, 3.35f, 5.12f), new Vector3(1.8f, 0.45f, 5.32f), new Vector3(1.8f, 0.45f, 3.95f)
                },
                new[] {
                    new Vector3(-7.35f, 1.8f, -0.42f), new Vector3(-7.8f, 1.8f, -0.42f), new Vector3(-7.8f, 3.36f, -0.42f),
                    new Vector3(-7.62f, 3.36f, 5.18f), new Vector3(6.35f, 3.36f, 5.18f), new Vector3(6.35f, 0.45f, 5.32f), new Vector3(6.35f, 0.45f, 3.95f)
                },
                new[] {
                    new Vector3(-7.35f, 1.65f, -0.45f), new Vector3(-7.8f, 1.65f, -0.45f), new Vector3(-7.8f, 3.35f, -0.45f),
                    new Vector3(-7.8f, 3.35f, 0.9f), new Vector3(-3.02f, 3.35f, 0.9f), new Vector3(-3.02f, 0.45f, 0.8f), new Vector3(-1.75f, 0.85f, -0.65f)
                },
                new[] {
                    new Vector3(-7.35f, 1.65f, -0.50f), new Vector3(-7.8f, 1.65f, -0.50f), new Vector3(-7.8f, 3.35f, -0.50f),
                    new Vector3(-3.0f, 3.35f, 0.9f), new Vector3(-3.0f, 3.35f, -5.15f), new Vector3(3.15f, 3.35f, -5.15f), new Vector3(3.15f, 0.45f, -5.32f), new Vector3(3.15f, 0.45f, -4.25f)
                }
            };

            for (int r = 0; r < routes.Length; r++)
            {
                var pts = routes[r];
                for (int i = 0; i < pts.Length - 1; i++)
                {
                    Vector3 a = pts[i];
                    Vector3 b = pts[i + 1];
                    Vector3 mid = (a + b) * 0.5f;
                    float len = Vector3.Distance(a, b);
                    GameObject seg = AddBox(cab.transform, $"Cat6A_Seg_{r}_{i}", mid, new Vector3(0.032f, 0.032f, len), cableMat, false);
                    seg.transform.LookAt(b);
                }

                // Esfera animada de flujo de paquetes de datos
                GameObject pkt = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                pkt.name = $"DataPacket_{r}";
                pkt.transform.SetParent(cab.transform, false);
                pkt.transform.localScale = Vector3.one * 0.11f;
                pkt.GetComponent<MeshRenderer>().sharedMaterial = packetMat;
                Object.DestroyImmediate(pkt.GetComponent<Collider>());

                ctrl.packetRoutes.Add(new DataPacketRoute
                {
                    packetMesh = pkt.transform,
                    waypoints = pts,
                    progress = (r * 0.22f) % 1f,
                    speed = 0.16f + (r % 2) * 0.04f
                });
            }

            TagInteractable(cab, "structured_cabling");
            AddLabel(ctrl, "Canaletas de Pared + Bandejas de Techo (Cat6A)", new Vector3(-7.6f, 3.55f, -0.45f));
        }

        private static Texture2D MakeGridTex(Color fill, Color line)
        {
            int sz = 64;
            Texture2D t = new Texture2D(sz, sz, TextureFormat.RGBA32, false);
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    bool edge = x < 2 || y < 2 || x > sz - 3 || y > sz - 3;
                    t.SetPixel(x, y, edge ? line : fill);
                }
            }
            t.Apply();
            return t;
        }
    }
}
#endif
