#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace UNAB.Transporte3D.EditorTools
{
    [InitializeOnLoad]
    public static class UNABSceneBuilderEditor
    {
        private static Shader activeShader;

        static UNABSceneBuilderEditor()
        {
            EditorApplication.delayCall += TryAutoUpgradeScene;
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
        }

        private static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredEditMode)
            {
                TryAutoUpgradeScene();
            }
        }

        private static void TryAutoUpgradeScene()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) return;
            if (GameObject.Find("UNAB_Transporte_Root") != null && GameObject.Find("UNAB_HD_V4_Avatar") == null)
            {
                BuildCompleteSceneInternal(false);
            }
        }

        [MenuItem("UNAB Transporte/Construir Escena 3D Completa (1-Click)", false, 1)]
        public static void BuildCompleteScene()
        {
            BuildCompleteSceneInternal(true);
        }

        private static void BuildCompleteSceneInternal(bool showDialog)
        {
            // Configurar Anti-Aliasing 4x MSAA para eliminar bordes dentados
            QualitySettings.antiAliasing = 4;
            QualitySettings.shadowResolution = ShadowResolution.VeryHigh;

            activeShader = Shader.Find("Universal Render Pipeline/Lit");
            if (activeShader == null) activeShader = Shader.Find("Standard");

            GameObject existing = GameObject.Find("UNAB_Transporte_Root");
            if (existing != null) Object.DestroyImmediate(existing);

            GameObject root = new GameObject("UNAB_Transporte_Root");
            Undo.RegisterCreatedObjectUndo(root, "Build UNAB Transporte 3D Scene");

            GameObject marker = new GameObject("UNAB_HD_V4_Avatar");
            marker.transform.SetParent(root.transform);

            var sim = root.AddComponent<UNABNetworkSimulator>();
            sim.InitializeDatabase();

            var ctrl = root.AddComponent<UNABSceneController>();
            root.AddComponent<UNABHudAndConsoleUI>();

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
            mainCam.fieldOfView = 50f;
            mainCam.allowMSAA = true;
            mainCam.allowHDR = true;

            // Activar Post-Processing y Anti-Aliasing SMAA en la camara URP de Unity 6 via SerializedObject
            foreach (var comp in mainCam.GetComponents<Component>())
            {
                if (comp != null && comp.GetType().Name == "UniversalAdditionalCameraData")
                {
                    SerializedObject so = new SerializedObject(comp);
                    var ppProp = so.FindProperty("m_RenderPostProcessing");
                    if (ppProp != null) ppProp.boolValue = true;
                    var aaProp = so.FindProperty("m_Antialiasing");
                    if (aaProp != null) aaProp.intValue = 2; // SMAA
                    so.ApplyModifiedProperties();
                }
            }

            ctrl.mainCamera = mainCam;

            SetupLightingAndReflections(root.transform);
            BuildEnvironmentAndWalls(root.transform, ctrl);
            BuildSuspendedCeiling(root.transform, ctrl);
            BuildDataCenterRoom(root.transform, ctrl);
            BuildMonitoringOffice(root.transform, ctrl);
            BuildStructuredCabling(root.transform, ctrl);
            BuildPlayerAvatar(root.transform, ctrl);

            Selection.activeGameObject = root;
            SceneView.RepaintAll();
            if (showDialog)
            {
                EditorUtility.DisplayDialog(
                    "UNAB - Area de Transporte 3D (Con Personaje 3D)",
                    "¡Escena 3D, Menu Superior y Personaje Caminante actualizados!\n\nPresiona PLAY (▶) para caminar con WASD en 3ra Persona o presiona la tecla V para alternar entre 1ra y 3ra Persona.",
                    "¡Listo!");
            }
        }

        private static Material CreatePbrMat(string name, Color color, float metallic = 0.05f, float smoothness = 0.5f, Texture2D tex = null, Vector2? tileScale = null, bool transparent = false, Color? emission = null)
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
                if (tileScale.HasValue)
                {
                    if (m.HasProperty("_BaseMap")) m.SetTextureScale("_BaseMap", tileScale.Value);
                    if (m.HasProperty("_MainTex")) m.SetTextureScale("_MainTex", tileScale.Value);
                }
            }

            if (transparent)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
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
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            if (!withCollider)
            {
                var c = go.GetComponent<Collider>();
                if (c != null) Object.DestroyImmediate(c);
            }
            return go;
        }

        private static GameObject AddCylinder(Transform parent, string name, Vector3 pos, Vector3 scale, Material mat, bool withCollider = false)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            if (!withCollider)
            {
                var c = go.GetComponent<Collider>();
                if (c != null) Object.DestroyImmediate(c);
            }
            return go;
        }

        private static GameObject AddSphere(Transform parent, string name, Vector3 pos, Vector3 scale, Material mat)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            var c = go.GetComponent<Collider>();
            if (c != null) Object.DestroyImmediate(c);
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
            RenderSettings.ambientSkyColor = new Color(0.78f, 0.85f, 0.94f);
            RenderSettings.ambientEquatorColor = new Color(0.58f, 0.65f, 0.75f);
            RenderSettings.ambientGroundColor = new Color(0.28f, 0.32f, 0.38f);

            Light dirLight = Object.FindAnyObjectByType<Light>();
            if (dirLight == null || dirLight.type != LightType.Directional)
            {
                GameObject dlObj = new GameObject("Sun_DirectionalLight");
                dlObj.transform.SetParent(lightGroup.transform, false);
                dirLight = dlObj.AddComponent<Light>();
                dirLight.type = LightType.Directional;
            }
            dirLight.transform.rotation = Quaternion.Euler(46f, -35f, 0f);
            dirLight.intensity = 1.35f;
            dirLight.color = new Color(1f, 0.98f, 0.95f);
            dirLight.shadows = LightShadows.Soft;

            GameObject rackLightObj = new GameObject("Rack_BluePointLight");
            rackLightObj.transform.SetParent(lightGroup.transform, false);
            rackLightObj.transform.localPosition = new Vector3(-6.1f, 1.8f, -0.2f);
            Light rl = rackLightObj.AddComponent<Light>();
            rl.type = LightType.Point;
            rl.color = new Color(0.22f, 0.58f, 0.98f);
            rl.intensity = 2.8f;
            rl.range = 6.5f;

            GameObject offLightObj = new GameObject("Office_InteriorLight");
            offLightObj.transform.SetParent(lightGroup.transform, false);
            offLightObj.transform.localPosition = new Vector3(2.4f, 2.85f, 0f);
            Light ol = offLightObj.AddComponent<Light>();
            ol.type = LightType.Point;
            ol.color = new Color(0.99f, 0.98f, 0.96f);
            ol.intensity = 2.2f;
            ol.range = 16f;

            GameObject probeObj = new GameObject("Room_ReflectionProbe");
            probeObj.transform.SetParent(lightGroup.transform, false);
            probeObj.transform.localPosition = new Vector3(0f, 1.8f, 0f);
            ReflectionProbe probe = probeObj.AddComponent<ReflectionProbe>();
            probe.mode = ReflectionProbeMode.Realtime;
            probe.refreshMode = ReflectionProbeRefreshMode.OnAwake;
            probe.boxProjection = true;
            probe.size = new Vector3(22f, 6f, 16f);
        }

        private static void BuildEnvironmentAndWalls(Transform root, UNABSceneController ctrl)
        {
            GameObject env = new GameObject("Architecture_And_Walls");
            env.transform.SetParent(root, false);

            Material grassMat = CreatePbrMat("Grass", new Color(0.39f, 0.63f, 0.06f), 0f, 0.15f);
            AddBox(env.transform, "Exterior_Grass", new Vector3(0f, -0.08f, 0f), new Vector3(48f, 0.08f, 38f), grassMat, false);

            // Camino exterior de piedras y arbustos decorativos
            Material stoneMat = CreatePbrMat("SteppingStones", new Color(0.66f, 0.64f, 0.62f), 0.05f, 0.25f);
            for (float z = -5.0f; z <= 5.0f; z += 0.85f)
            {
                for (float x = 9.4f; x <= 10.8f; x += 0.7f)
                {
                    AddCylinder(env.transform, "Stone", new Vector3(x, -0.03f, z), new Vector3(0.58f, 0.03f, 0.58f), stoneMat);
                }
            }

            Material bushMat = CreatePbrMat("BushGreen", new Color(0.25f, 0.39f, 0.08f), 0f, 0.25f);
            Vector2[] bushCoords = { new Vector2(-10.2f, 3.2f), new Vector2(-10.2f, -4.8f), new Vector2(-6.5f, -7.2f), new Vector2(10.2f, 3.6f), new Vector2(10.2f, -3.6f) };
            foreach (var bc in bushCoords)
            {
                GameObject bg = new GameObject("Bush");
                bg.transform.SetParent(env.transform, false);
                bg.transform.localPosition = new Vector3(bc.x, 0f, bc.y);
                AddSphere(bg.transform, "Main", new Vector3(0f, 0.45f, 0f), Vector3.one * 1.2f, bushMat);
                for (int i = 0; i < 4; i++)
                {
                    AddSphere(bg.transform, "Sub", new Vector3(Mathf.Cos(i * 1.5f) * 0.35f, 0.28f, Mathf.Sin(i * 1.5f) * 0.35f), Vector3.one * 0.75f, bushMat);
                }
            }

            Material dcFloorMat = CreatePbrMat("RaisedFloor_DC", Color.white, 0.35f, 0.62f, MakeRaisedFloorTex(), new Vector2(5f, 11f));
            AddBox(env.transform, "DataCenter_RaisedFloor", new Vector3(-5.6f, 0.08f, 0f), new Vector3(4.8f, 0.16f, 11.0f), dcFloorMat);

            Material offFloorMat = CreatePbrMat("OfficeTiles", Color.white, 0.05f, 0.72f, MakeOfficeTileTex(), new Vector2(9f, 10f));
            AddBox(env.transform, "Office_TileFloor", new Vector3(2.4f, 0.06f, 0f), new Vector3(11.2f, 0.12f, 11.0f), offFloorMat);

            Material wallWhiteMat = CreatePbrMat("Wall_White", new Color(0.97f, 0.98f, 0.99f), 0.02f, 0.5f);
            Material trimBlackMat = CreatePbrMat("Trim_Black", new Color(0.07f, 0.09f, 0.13f), 0.4f, 0.68f);
            Material glassBlueMat = CreatePbrMat("Glass_Reflective_UNAB", new Color(0.55f, 0.82f, 0.98f, 0.74f), 0.78f, 0.95f, MakeReflectiveGlassTex(), Vector2.one, true, new Color(0.03f, 0.14f, 0.25f));

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

            AddSolidWall(0f, -5.5f, 16.24f, wallT);
            AddSolidWall(-8.0f, 0f, wallT, 11.24f);
            AddSolidWall(-2.5f, 5.5f, 11.0f, wallT);
            AddCurtainGlassWall(4.7f, 5.5f, 3.4f, false);
            AddSolidWall(7.2f, 5.5f, 1.6f, wallT);

            AddCurtainGlassWall(8.0f, -3.5f, 3.3f, true);
            AddSolidWall(8.0f, -5.32f, wallT, 0.36f);
            AddCurtainGlassWall(8.0f, 3.5f, 3.3f, true);
            AddSolidWall(8.0f, 5.32f, wallT, 0.36f);
            AddDoorwayLintel(8.0f, 0f, wallT, 3.7f);

            AddSolidWall(-3.2f, -5.0f, wallT, 1.0f);
            AddSolidWall(-3.2f, -2.5f, wallT, 1.7f);
            AddCurtainGlassWall(-3.2f, 0.3f, 3.9f, true);
            AddSolidWall(-3.2f, 3.9f, wallT, 3.3f);
            AddDoorwayLintel(-3.2f, -3.925f, wallT, 1.15f);

            void AddDoorLeaf(float hx, float hzThree, float widthZ, float closedDeg, float openDeg, int hingeDir)
            {
                float hz = -hzThree;
                GameObject doorRoot = new GameObject("Door_Hinge");
                doorRoot.transform.SetParent(env.transform, false);
                doorRoot.transform.localPosition = new Vector3(hx, 0f, hz);

                float doorH = 2.82f;
                float frameW = 0.07f;
                float dir = -hingeDir;

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

            Material tileMat = CreatePbrMat("AcousticCeiling", Color.white, 0f, 0.35f, MakeAcousticCeilingTex(), new Vector2(16f, 11f));
            Material gridMat = CreatePbrMat("CeilingGrid", new Color(0.78f, 0.82f, 0.86f), 0.4f, 0.6f);
            Material ledMat = CreatePbrMat("CeilingLED", Color.white, 0f, 0.9f, null, null, false, Color.white * 1.8f);

            AddBox(ceil.transform, "AcousticSlab", new Vector3(0f, 3.16f, 0f), new Vector3(16.0f, 0.04f, 11.0f), tileMat, false);

            // Reticula metalica T-bar completa
            for (float x = -7.2f; x <= 7.2f; x += 1.2f)
                AddBox(ceil.transform, "TBar_X", new Vector3(x, 3.125f, 0f), new Vector3(0.04f, 0.02f, 10.8f), gridMat, false);
            for (float z = -4.8f; z <= 4.8f; z += 1.2f)
                AddBox(ceil.transform, "TBar_Z", new Vector3(0f, 3.125f, z), new Vector3(15.8f, 0.02f, 0.04f), gridMat, false);

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
            Material silverMat = CreatePbrMat("SilverRails", new Color(0.62f, 0.66f, 0.72f), 0.85f, 0.75f);
            Material yellowLabelMat = CreatePbrMat("YellowLabel", new Color(0.96f, 0.76f, 0.08f), 0.1f, 0.6f);
            Material blueLedMat = CreatePbrMat("BlueLED", new Color(0.22f, 0.58f, 0.98f), 0f, 0.9f, null, null, false, new Color(0.22f, 0.58f, 0.98f) * 2.5f);
            Material greenLedMat = CreatePbrMat("GreenLED", new Color(0.15f, 0.85f, 0.38f), 0f, 0.9f, null, null, false, new Color(0.15f, 0.85f, 0.38f) * 2.2f);
            Material redLedMat = CreatePbrMat("RedPDU", new Color(0.95f, 0.18f, 0.18f), 0f, 0.9f, null, null, false, new Color(0.95f, 0.18f, 0.18f) * 2f);
            Material utpBlueMat = CreatePbrMat("Cat6ABlue", new Color(0.02f, 0.52f, 0.78f), 0.1f, 0.6f);
            Material whiteMat = CreatePbrMat("RouterWhite", new Color(0.95f, 0.96f, 0.98f), 0.1f, 0.65f);
            Material lcdBlueMat = CreatePbrMat("UpsLCD220V", Color.white, 0.1f, 0.9f, MakeUpsLcdTex(), null, false, new Color(0.15f, 0.65f, 0.98f) * 1.3f);
            Material cracMeshLogoMat = CreatePbrMat("CracMeshLogo", Color.white, 0.5f, 0.5f, MakeCracMeshTex(true));
            Material cracMeshPlainMat = CreatePbrMat("CracMeshPlain", Color.white, 0.5f, 0.5f, MakeCracMeshTex(false));

            // 1. RACK PRINCIPAL 42U DETALLADO (CON PUERTA ABIERTA, CABLES CAT6A, RAILS, SERVIDORES Y ROUTER)
            GameObject rack = new GameObject("Rack_Main_42U");
            rack.transform.SetParent(dc.transform, false);
            rack.transform.localPosition = new Vector3(-6.75f, 0.16f, -0.45f);
            rack.transform.localEulerAngles = new Vector3(0f, -90f, 0f);

            AddBox(rack.transform, "Rack_Collider", new Vector3(0f, 1.15f, 0f), new Vector3(0.98f, 2.3f, 1.0f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));
            AddBox(rack.transform, "Base", new Vector3(0f, 0.08f, 0f), new Vector3(0.92f, 0.08f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "Roof", new Vector3(0f, 2.24f, 0f), new Vector3(0.92f, 0.07f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "YellowTopTag", new Vector3(0f, 2.24f, 0.485f), new Vector3(0.32f, 0.032f, 0.01f), yellowLabelMat, false);
            AddBox(rack.transform, "BackDoor", new Vector3(0f, 1.16f, -0.46f), new Vector3(0.88f, 2.12f, 0.03f), darkMetal, false);

            float[] posts = { -0.43f, -0.43f,  0.43f, -0.43f,  -0.43f, 0.43f,  0.43f, 0.43f };
            for (int i = 0; i < posts.Length; i += 2)
            {
                AddBox(rack.transform, "Post", new Vector3(posts[i], 1.16f, posts[i + 1]), new Vector3(0.06f, 2.12f, 0.06f), darkMetal, false);
                AddCylinder(rack.transform, "CasterWheel", new Vector3(posts[i] * 0.9f, 0.03f, posts[i + 1] * 0.9f), new Vector3(0.06f, 0.025f, 0.06f), silverMat);
            }

            AddBox(rack.transform, "Rail_L", new Vector3(-0.37f, 1.16f, 0.36f), new Vector3(0.025f, 2.04f, 0.025f), silverMat, false);
            AddBox(rack.transform, "Rail_R", new Vector3(0.37f, 1.16f, 0.36f), new Vector3(0.025f, 2.04f, 0.025f), silverMat, false);
            AddBox(rack.transform, "LED_Strip_L", new Vector3(-0.40f, 1.16f, 0.44f), new Vector3(0.018f, 2.02f, 0.018f), blueLedMat, false);
            AddBox(rack.transform, "LED_Strip_R", new Vector3(0.40f, 1.16f, 0.44f), new Vector3(0.018f, 2.02f, 0.018f), blueLedMat, false);

            // Puerta frontal perforada abierta a 70 grados
            GameObject rackDoor = new GameObject("OpenFrontDoor");
            rackDoor.transform.SetParent(rack.transform, false);
            rackDoor.transform.localPosition = new Vector3(-0.45f, 1.16f, 0.47f);
            rackDoor.transform.localEulerAngles = new Vector3(0f, 70f, 0f);
            AddBox(rackDoor.transform, "DoorFrame", new Vector3(0.44f, 0f, 0f), new Vector3(0.88f, 2.10f, 0.025f), CreatePbrMat("RackGlass", new Color(0.1f, 0.14f, 0.2f, 0.42f), 0.6f, 0.9f, null, null, true), false);

            // 2 Patch Panels + 2 Switches Gigabit con peines de cables Cat6A y botas amarillas
            float[] ppHeights = { 2.02f, 1.62f };
            float[] swHeights = { 1.82f, 1.42f };
            for (int b = 0; b < 2; b++)
            {
                float py = ppHeights[b];
                float sy = swHeights[b];
                AddBox(rack.transform, "PatchPanel_24P", new Vector3(0f, py, 0.34f), new Vector3(0.78f, 0.09f, 0.12f), darkMetal, false);
                AddBox(rack.transform, "Switch_24P", new Vector3(0f, sy, 0.12f), new Vector3(0.78f, 0.09f, 0.48f), chassisGray, false);

                for (int p = 0; p < 12; p++)
                {
                    float px = -0.32f + p * 0.058f;
                    AddBox(rack.transform, "BootY", new Vector3(px, py, 0.405f), new Vector3(0.016f, 0.016f, 0.02f), yellowLabelMat, false);
                    AddBox(rack.transform, "PatchCord", new Vector3(px, (py + sy) * 0.5f, 0.42f), new Vector3(0.012f, Mathf.Abs(py - sy), 0.012f), utpBlueMat, false);
                    AddBox(rack.transform, "PortLED", new Vector3(px, sy + 0.025f, 0.365f), new Vector3(0.012f, 0.012f, 0.01f), greenLedMat, false);
                }
            }

            // Router Blanco con 2 antenas y LEDs verdes
            AddBox(rack.transform, "Router_Shelf", new Vector3(0f, 1.14f, 0.05f), new Vector3(0.78f, 0.025f, 0.62f), darkMetal, false);
            AddBox(rack.transform, "Router_Body", new Vector3(0f, 1.19f, 0.16f), new Vector3(0.36f, 0.065f, 0.24f), whiteMat, false);
            AddBox(rack.transform, "Router_LEDs", new Vector3(0f, 1.19f, 0.282f), new Vector3(0.18f, 0.012f, 0.01f), greenLedMat, false);
            AddCylinder(rack.transform, "Antenna_L", new Vector3(-0.14f, 1.31f, 0.08f), new Vector3(0.018f, 0.11f, 0.018f), whiteMat);
            AddCylinder(rack.transform, "Antenna_R", new Vector3(0.14f, 1.31f, 0.08f), new Vector3(0.018f, 0.11f, 0.018f), whiteMat);

            // Servidor 1U + Servidor 4U de 4 bahias Hot-Swap + PDU
            AddBox(rack.transform, "Server_1U_App", new Vector3(0f, 0.92f, 0.02f), new Vector3(0.78f, 0.11f, 0.72f), chassisGray, false);
            AddBox(rack.transform, "Server_1U_LCD", new Vector3(-0.24f, 0.92f, 0.385f), new Vector3(0.12f, 0.035f, 0.01f), blueLedMat, false);

            AddBox(rack.transform, "Server_4U_DB", new Vector3(0f, 0.48f, 0.02f), new Vector3(0.76f, 0.34f, 0.74f), darkMetal, false);
            for (int bay = 0; bay < 4; bay++)
            {
                float bx = -0.24f + bay * 0.16f;
                AddBox(rack.transform, "DriveCaddy", new Vector3(bx, 0.48f, 0.395f), new Vector3(0.13f, 0.24f, 0.02f), chassisGray, false);
                AddBox(rack.transform, "BayLED", new Vector3(bx + 0.04f, 0.56f, 0.41f), new Vector3(0.015f, 0.015f, 0.01f), blueLedMat, false);
            }

            AddBox(rack.transform, "PDU_Power", new Vector3(0f, 0.21f, 0.28f), new Vector3(0.78f, 0.075f, 0.16f), darkMetal, false);
            AddBox(rack.transform, "PDU_Switch", new Vector3(-0.31f, 0.21f, 0.365f), new Vector3(0.035f, 0.035f, 0.015f), redLedMat, false);

            TagInteractable(rack, "rack_main");
            AddLabel(ctrl, "Rack Principal de Telecomunicaciones (42U)", new Vector3(-6.75f, 2.65f, -0.45f));

            // 2. SISTEMA UPS ONLINE 220V (3 MODULOS ESCALONADOS CON RANURAS Y LCD 220V)
            GameObject upsGroup = new GameObject("UPS_3000VA_Bank");
            upsGroup.transform.SetParent(dc.transform, false);
            upsGroup.transform.localPosition = new Vector3(-5.25f, 0.16f, -4.55f);
            upsGroup.transform.localEulerAngles = new Vector3(0f, 180f, 0f);

            AddBox(upsGroup.transform, "UPS_Collider", new Vector3(0f, 0.48f, 0f), new Vector3(1.35f, 0.96f, 0.75f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));

            (float x, float w, float h, float d)[] upsSpecs =
            {
                (-0.42f, 0.38f, 0.86f, 0.68f),
                ( 0.02f, 0.34f, 0.68f, 0.60f),
                ( 0.41f, 0.30f, 0.54f, 0.52f)
            };
            foreach (var u in upsSpecs)
            {
                AddBox(upsGroup.transform, "UPS_Tower", new Vector3(u.x, u.h * 0.5f, 0f), new Vector3(u.w, u.h, u.d), darkMetal, false);
                AddBox(upsGroup.transform, "FrontBezel", new Vector3(u.x, u.h * 0.5f, u.d * 0.5f + 0.01f), new Vector3(u.w * 0.94f, u.h * 0.94f, 0.02f), chassisGray, false);
                AddBox(upsGroup.transform, "UPS_LCD_220V", new Vector3(u.x, u.h * 0.76f, u.d * 0.5f + 0.022f), new Vector3(u.w * 0.46f, 0.11f, 0.01f), lcdBlueMat, false);
                for (int s = 0; s < 5; s++)
                {
                    float sy = 0.10f + s * (u.h * 0.08f);
                    AddBox(upsGroup.transform, "VentSlat", new Vector3(u.x, sy, u.d * 0.5f + 0.022f), new Vector3(u.w * 0.76f, 0.016f, 0.01f), darkMetal, false);
                }
            }
            TagInteractable(upsGroup, "ups_power");
            AddLabel(ctrl, "Banco de UPS Online 220V (3000VA)", new Vector3(-5.25f, 1.32f, -4.55f));

            // 3. CLIMATIZADOR DE PRECISION EDAPOWER CRAC (MALLA PERFORADA + LOGO + PANTALLA HMI)
            GameObject crac = new GameObject("EDApower_CRAC_Unit");
            crac.transform.SetParent(dc.transform, false);
            crac.transform.localPosition = new Vector3(-6.35f, 0.16f, 4.78f);

            AddBox(crac.transform, "Cabinet", new Vector3(0f, 1.12f, 0f), new Vector3(1.18f, 2.24f, 0.74f), darkMetal);
            AddBox(crac.transform, "TopMeshLogo", new Vector3(0f, 1.82f, -0.375f), new Vector3(1.08f, 0.68f, 0.02f), cracMeshLogoMat, false);
            AddBox(crac.transform, "BottomMesh", new Vector3(0f, 0.52f, -0.375f), new Vector3(1.08f, 0.82f, 0.02f), cracMeshPlainMat, false);
            AddBox(crac.transform, "HMI_Bezel", new Vector3(0.04f, 1.24f, -0.38f), new Vector3(0.30f, 0.22f, 0.02f), silverMat, false);
            AddBox(crac.transform, "HMI_Touchscreen", new Vector3(0.04f, 1.24f, -0.39f), new Vector3(0.25f, 0.17f, 0.01f), lcdBlueMat, false);
            AddBox(crac.transform, "SwingHandle", new Vector3(0.42f, 0.65f, -0.39f), new Vector3(0.03f, 0.18f, 0.02f), silverMat, false);

            TagInteractable(crac, "ac_unit");
            AddLabel(ctrl, "Climatizador de Precision EDApower CRAC", new Vector3(-6.35f, 2.58f, 4.78f));
        }

        private static void BuildMonitoringOffice(Transform root, UNABSceneController ctrl)
        {
            GameObject office = new GameObject("Monitoring_Office_Furniture");
            office.transform.SetParent(root, false);

            Material woodMat = CreatePbrMat("DeskWood", new Color(0.84f, 0.66f, 0.44f), 0.05f, 0.58f);
            Material legMat = CreatePbrMat("DeskMetal", new Color(0.18f, 0.22f, 0.27f), 0.7f, 0.6f);
            Material darkMat = CreatePbrMat("PCBlack", new Color(0.09f, 0.10f, 0.12f), 0.5f, 0.62f);
            Material screenMat1 = CreatePbrMat("GpsScreen1", Color.white, 0.1f, 0.88f, MakeBusScreenTex(true), null, false, new Color(0.12f, 0.48f, 0.78f) * 0.9f);
            Material screenMat2 = CreatePbrMat("GpsScreen2", Color.white, 0.1f, 0.88f, MakeBusScreenTex(false), null, false, new Color(0.12f, 0.48f, 0.78f) * 0.9f);
            Material whiteShelfMat = CreatePbrMat("ShelfWhite", new Color(0.96f, 0.97f, 0.98f), 0.05f, 0.55f);
            Material plantPotMat = CreatePbrMat("PotGray", new Color(0.60f, 0.64f, 0.68f), 0.3f, 0.45f);
            Material leafGreenMat = CreatePbrMat("LeafGreen", new Color(0.16f, 0.48f, 0.18f), 0.05f, 0.4f);
            Material chartMat = CreatePbrMat("PrintedChart", Color.white, 0f, 0.5f, MakePrintedChartTex());

            void BuildDesk(float x, float zThree, float rotY, string key, string labelText, Material scrMat)
            {
                float z = -zThree;
                GameObject d = new GameObject($"Workstation_{key}");
                d.transform.SetParent(office.transform, false);
                d.transform.localPosition = new Vector3(x, 0.12f, z);
                d.transform.localEulerAngles = new Vector3(0f, rotY, 0f);

                AddBox(d.transform, "Desk_Collider", new Vector3(0f, 0.68f, 0f), new Vector3(2.2f, 1.35f, 1.25f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));
                AddBox(d.transform, "TableTop", new Vector3(0f, 0.74f, 0f), new Vector3(2.15f, 0.06f, 1.05f), woodMat, false);

                float[] legs = { -0.98f, -0.44f,  0.98f, -0.44f,  -0.98f, 0.44f,  0.98f, 0.44f };
                for (int i = 0; i < legs.Length; i += 2)
                    AddBox(d.transform, "Leg", new Vector3(legs[i], 0.37f, legs[i + 1]), new Vector3(0.06f, 0.74f, 0.06f), legMat, false);

                AddBox(d.transform, "Monitor_Frame", new Vector3(0f, 1.12f, 0.18f), new Vector3(0.86f, 0.50f, 0.04f), darkMat, false);
                AddBox(d.transform, "Monitor_Screen", new Vector3(0f, 1.12f, 0.155f), new Vector3(0.80f, 0.44f, 0.01f), scrMat, false);
                AddBox(d.transform, "Monitor_Stand", new Vector3(0f, 0.85f, 0.20f), new Vector3(0.08f, 0.18f, 0.08f), darkMat, false);
                AddBox(d.transform, "Monitor_Base", new Vector3(0f, 0.775f, 0.20f), new Vector3(0.28f, 0.015f, 0.20f), darkMat, false);
                AddBox(d.transform, "Keyboard", new Vector3(-0.05f, 0.78f, -0.15f), new Vector3(0.42f, 0.02f, 0.15f), darkMat, false);
                AddBox(d.transform, "Mouse", new Vector3(0.28f, 0.78f, -0.15f), new Vector3(0.07f, 0.025f, 0.11f), darkMat, false);

                // PC Tower en el piso bajo el escritorio con boton power iluminado
                AddBox(d.transform, "PC_Tower_Floor", new Vector3(0.75f, 0.26f, 0.05f), new Vector3(0.23f, 0.50f, 0.48f), darkMat, false);
                AddBox(d.transform, "PC_PowerLED", new Vector3(0.75f, 0.44f, -0.195f), new Vector3(0.04f, 0.015f, 0.01f), screenMat1, false);

                // Silla ergonomica completa
                AddBox(d.transform, "Chair_Seat", new Vector3(0f, 0.46f, -0.68f), new Vector3(0.52f, 0.07f, 0.52f), darkMat, false);
                AddBox(d.transform, "Chair_Back", new Vector3(0f, 0.82f, -0.91f), new Vector3(0.50f, 0.65f, 0.07f), darkMat, false);
                AddCylinder(d.transform, "Chair_Piston", new Vector3(0f, 0.24f, -0.68f), new Vector3(0.06f, 0.22f, 0.06f), legMat);

                TagInteractable(d, key);
                AddLabel(ctrl, labelText, new Vector3(x, 2.25f, z));
            }

            BuildDesk(0.85f, -3.85f, 0f, "pc_monitor_1", "PC Monitoreo #1 (Mapa GPS)", screenMat1);
            BuildDesk(5.4f, -3.85f, 0f, "pc_monitor_2", "PC Monitoreo #2 (Salidas/Llegadas)", screenMat2);
            BuildDesk(4.1f, 4.15f, 180f, "pc_admin", "PC Administracion de Red", screenMat1);

            // Impresora Epson EcoTank detallada con tanques CMYK y hoja impresa
            GameObject prn = new GameObject("Epson_EcoTank_Printer");
            prn.transform.SetParent(office.transform, false);
            prn.transform.localPosition = new Vector3(-1.75f, 0.12f, -0.65f);

            AddBox(prn.transform, "Stand", new Vector3(0f, 0.37f, 0f), new Vector3(0.95f, 0.74f, 0.74f), CreatePbrMat("StandBeige", new Color(0.83f, 0.80f, 0.73f)));
            AddBox(prn.transform, "Body", new Vector3(-0.06f, 0.88f, 0f), new Vector3(0.58f, 0.28f, 0.46f), darkMat);
            GameObject lid = AddBox(prn.transform, "ScannerLid", new Vector3(-0.06f, 1.04f, 0f), new Vector3(0.57f, 0.03f, 0.45f), darkMat, false);
            lid.transform.localEulerAngles = new Vector3(-4f, 0f, 0f);
            AddBox(prn.transform, "EcoTank_Module", new Vector3(0.28f, 0.86f, 0.06f), new Vector3(0.14f, 0.24f, 0.32f), darkMat, false);

            Color[] cmyk = { Color.black, Color.yellow, Color.magenta, Color.cyan };
            for (int t = 0; t < 4; t++)
            {
                AddBox(prn.transform, $"InkVial_{t}", new Vector3(0.26f + t * 0.025f, 0.85f, -0.105f), new Vector3(0.018f, 0.14f, 0.01f),
                    CreatePbrMat($"Ink_{t}", cmyk[t], 0.1f, 0.8f), false);
            }
            AddBox(prn.transform, "Printed_Sheet", new Vector3(-0.06f, 0.76f, -0.34f), new Vector3(0.32f, 0.01f, 0.26f), chartMat, false);

            TagInteractable(prn, "printer_net");
            AddLabel(ctrl, "Impresora Epson EcoTank en Red", new Vector3(-1.75f, 1.55f, -0.65f));

            // Estante Blanco de 5 Niveles con archivadores, libros y jarrones
            GameObject shelf = new GameObject("White_5Tier_Bookcase");
            shelf.transform.SetParent(office.transform, false);
            shelf.transform.localPosition = new Vector3(-2.72f, 0.12f, -3.55f);
            shelf.transform.localEulerAngles = new Vector3(0f, 90f, 0f);

            AddBox(shelf.transform, "LeftSide", new Vector3(-0.44f, 1.05f, 0f), new Vector3(0.03f, 2.10f, 0.36f), whiteShelfMat);
            AddBox(shelf.transform, "RightSide", new Vector3(0.44f, 1.05f, 0f), new Vector3(0.03f, 2.10f, 0.36f), whiteShelfMat);
            AddBox(shelf.transform, "BackPanel", new Vector3(0f, 1.05f, -0.17f), new Vector3(0.90f, 2.10f, 0.02f), whiteShelfMat);

            Color[] bookCols = { new Color(0.15f, 0.32f, 0.58f), new Color(0.68f, 0.24f, 0.14f), new Color(0.22f, 0.26f, 0.32f), new Color(0.75f, 0.56f, 0.22f) };
            for (int s = 0; s <= 5; s++)
            {
                float sy = 0.04f + s * 0.40f;
                AddBox(shelf.transform, $"Board_{s}", new Vector3(0f, sy, 0f), new Vector3(0.88f, 0.03f, 0.35f), whiteShelfMat, false);
                if (s < 5)
                {
                    for (int b = 0; b < 5; b++)
                    {
                        Material bm = CreatePbrMat("Book", bookCols[(s + b) % bookCols.Length], 0.05f, 0.4f);
                        AddBox(shelf.transform, "Binder", new Vector3(-0.32f + b * 0.11f, sy + 0.15f, 0.02f), new Vector3(0.07f, 0.26f, 0.24f), bm, false);
                    }
                    AddCylinder(shelf.transform, "CeramicVase", new Vector3(0.30f, sy + 0.11f, 0.02f), new Vector3(0.09f, 0.09f, 0.09f), whiteShelfMat);
                }
            }

            // Macetas Altas Dracaena con tallos y hojas arqueadas
            Material stemMat = CreatePbrMat("WoodyStem", new Color(0.42f, 0.28f, 0.16f), 0f, 0.3f);
            void BuildPlanter(float px, float pzThree)
            {
                GameObject pl = new GameObject("Indoor_Planter");
                pl.transform.SetParent(office.transform, false);
                pl.transform.localPosition = new Vector3(px, 0.12f, -pzThree);
                AddBox(pl.transform, "TaperedPot", new Vector3(0f, 0.38f, 0f), new Vector3(0.36f, 0.76f, 0.36f), plantPotMat);
                AddCylinder(pl.transform, "Stem1", new Vector3(-0.04f, 0.92f, 0f), new Vector3(0.04f, 0.22f, 0.04f), stemMat);
                AddCylinder(pl.transform, "Stem2", new Vector3(0.05f, 0.88f, 0.03f), new Vector3(0.035f, 0.18f, 0.035f), stemMat);

                for (int l = 0; l < 10; l++)
                {
                    float ang = l * 36f;
                    GameObject leaf = AddBox(pl.transform, "DracaenaLeaf", new Vector3(0f, 1.18f + (l % 3) * 0.08f, 0f), new Vector3(0.08f, 0.02f, 0.52f), leafGreenMat, false);
                    leaf.transform.localEulerAngles = new Vector3(25f + (l % 2) * 12f, ang, 0f);
                }
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
            Material cableMat = CreatePbrMat("CableCat6A", new Color(0.02f, 0.52f, 0.78f), 0.1f, 0.65f, null, null, false, new Color(0.01f, 0.25f, 0.42f));
            Material packetMat = CreatePbrMat("DataPacket", new Color(0.22f, 0.74f, 0.98f), 0f, 0.9f, null, null, false, new Color(0.22f, 0.74f, 0.98f) * 2.5f);

            AddBox(cab.transform, "Tray_West", new Vector3(-7.65f, 3.32f, 0.3f), new Vector3(0.38f, 0.04f, 9.7f), trayMat, false);
            AddBox(cab.transform, "Tray_North", new Vector3(-0.55f, 3.32f, 5.15f), new Vector3(14.2f, 0.04f, 0.38f), trayMat, false);
            AddBox(cab.transform, "Tray_Partition", new Vector3(-3.02f, 3.32f, 0f), new Vector3(0.36f, 0.04f, 10.3f), trayMat, false);
            AddBox(cab.transform, "Tray_South", new Vector3(0.6f, 3.32f, -5.15f), new Vector3(7.3f, 0.04f, 0.36f), trayMat, false);

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

                GameObject pkt = AddSphere(cab.transform, $"DataPacket_{r}", pts[0], Vector3.one * 0.11f, packetMat);
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

        // ============================================================================
        // TEXTURAS PROCEDURALES DE ALTA RESOLUCION (512x512 CON ANISOTROPIC FILTERING)
        // ============================================================================
        private static Texture2D MakeRaisedFloorTex()
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8, wrapMode = TextureWrapMode.Repeat };
            Color bg = new Color(0.12f, 0.14f, 0.17f);
            Color border = new Color(0.06f, 0.08f, 0.10f);
            Color slot = new Color(0.04f, 0.05f, 0.07f);

            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    bool isBorder = x < 6 || y < 6 || x > sz - 7 || y > sz - 7;
                    bool isSlot = (x > 28 && x < 228 && y > 28 && y < 228) && ((x % 48) < 32) && ((y % 24) < 10);
                    t.SetPixel(x, y, isBorder ? border : (isSlot ? slot : bg));
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakeOfficeTileTex()
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8, wrapMode = TextureWrapMode.Repeat };
            Color bg = new Color(0.91f, 0.87f, 0.79f);
            Color grout = new Color(0.78f, 0.73f, 0.64f);
            for (int y = 0; y < sz; y++)
                for (int x = 0; x < sz; x++)
                    t.SetPixel(x, y, (x < 4 || y < 4 || x > sz - 5 || y > sz - 5) ? grout : bg);
            t.Apply();
            return t;
        }

        private static Texture2D MakeAcousticCeilingTex()
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8, wrapMode = TextureWrapMode.Repeat };
            Color bg = new Color(0.97f, 0.98f, 0.99f);
            Color dot = new Color(0.88f, 0.90f, 0.93f);
            Color edge = new Color(0.78f, 0.82f, 0.87f);
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    if (x < 6 || y < 6 || x > sz - 7 || y > sz - 7) t.SetPixel(x, y, edge);
                    else if (((x * 73 + y * 137) % 29) == 0) t.SetPixel(x, y, dot);
                    else t.SetPixel(x, y, bg);
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakeReflectiveGlassTex()
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8 };
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    float diag = (x + y) / (float)(sz * 2);
                    float wave = Mathf.Sin(diag * 12f) * 0.5f + 0.5f;
                    Color c = Color.Lerp(new Color(0.02f, 0.45f, 0.75f, 0.75f), new Color(0.68f, 0.90f, 0.99f, 0.82f), wave * 0.65f);
                    t.SetPixel(x, y, c);
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakeUpsLcdTex()
        {
            int sz = 128;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, false);
            Color bg = new Color(0.02f, 0.52f, 0.82f);
            Color fg = new Color(0.88f, 0.96f, 1.0f);
            for (int y = 0; y < sz; y++)
                for (int x = 0; x < sz; x++)
                    t.SetPixel(x, y, (x < 5 || y < 5 || x > sz - 6 || y > sz - 6 || (y > 45 && y < 82 && x > 22 && x < 104 && (x % 24 < 16))) ? fg : bg);
            t.Apply();
            return t;
        }

        private static Texture2D MakeCracMeshTex(bool withLogo)
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8 };
            Color frame = new Color(0.10f, 0.10f, 0.12f);
            Color hole = new Color(0.03f, 0.03f, 0.04f);
            Color badge = new Color(0.90f, 0.92f, 0.95f);
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    if (withLogo && x > 28 && x < 118 && y > 188 && y < 216)
                        t.SetPixel(x, y, badge);
                    else
                        t.SetPixel(x, y, ((x % 8) < 4 && (y % 8) < 4) ? hole : frame);
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakeBusScreenTex(bool mapVariant)
        {
            int w = 256, h = 160;
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            Color bg = new Color(0.06f, 0.16f, 0.26f);
            Color header = new Color(0.02f, 0.52f, 0.78f);
            Color park = new Color(0.08f, 0.32f, 0.18f);
            Color road = new Color(0.22f, 0.74f, 0.97f);

            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    if (y > h - 22) t.SetPixel(x, y, header);
                    else if (Mathf.Abs(y - 78) < 3 || Mathf.Abs(x - 118) < 3) t.SetPixel(x, y, road);
                    else if ((x > 18 && x < 95 && y > 90 && y < 130) || (x > 140 && x < 225 && y > 20 && y < 65)) t.SetPixel(x, y, park);
                    else t.SetPixel(x, y, bg);
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakePrintedChartTex()
        {
            int sz = 128;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, false);
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    if (x > 12 && x < 22 && y > 14 && y < 114) t.SetPixel(x, y, new Color(0.1f, 0.65f, 0.25f));
                    else if (y > 85 && y < 95 && x > 32 && x < 105) t.SetPixel(x, y, new Color(0.15f, 0.4f, 0.9f));
                    else if (y > 65 && y < 75 && x > 32 && x < 90) t.SetPixel(x, y, new Color(0.9f, 0.25f, 0.25f));
                    else t.SetPixel(x, y, Color.white);
                }
            }
            t.Apply();
            return t;
        }

        // Construye el personaje 3D articulado (Ingeniero de Red UNAB) con animacion de caminata y soporte 1ra/3ra persona
        private static void BuildPlayerAvatar(Transform root, UNABSceneController ctrl)
        {
            GameObject playerRoot = new GameObject("PlayerAvatar_UNAB");
            playerRoot.transform.SetParent(root);
            playerRoot.transform.localPosition = new Vector3(2.2f, 0f, -0.4f);

            GameObject visuals = new GameObject("AvatarVisuals");
            visuals.transform.SetParent(playerRoot.transform);
            visuals.transform.localPosition = Vector3.zero;
            visuals.transform.localEulerAngles = new Vector3(0f, -90f, 0f);

            Material skinMat = CreatePbrMat("AvatarSkin", new Color(0.92f, 0.76f, 0.64f), 0.02f, 0.35f);
            Material hairMat = CreatePbrMat("AvatarHair", new Color(0.11f, 0.09f, 0.08f), 0.05f, 0.4f);
            Material jacketMat = CreatePbrMat("AvatarJacketUNAB", new Color(0.08f, 0.16f, 0.32f), 0.08f, 0.45f);
            Material shirtMat = CreatePbrMat("AvatarShirt", new Color(0.95f, 0.96f, 0.98f), 0.02f, 0.3f);
            Material pantsMat = CreatePbrMat("AvatarPants", new Color(0.14f, 0.16f, 0.20f), 0.05f, 0.35f);
            Material shoeMat = CreatePbrMat("AvatarShoes", new Color(0.07f, 0.07f, 0.09f), 0.15f, 0.6f);
            Material lanyardMat = CreatePbrMat("AvatarLanyard", new Color(0.02f, 0.65f, 0.92f), 0.1f, 0.6f, emission: new Color(0.01f, 0.18f, 0.28f));

            // Torso (Chaqueta institucional azul marino UNAB + camisa blanca + fotocheck)
            AddBox(visuals.transform, "Torso_Jacket", new Vector3(0f, 1.07f, 0f), new Vector3(0.36f, 0.50f, 0.20f), jacketMat, false);
            AddBox(visuals.transform, "Shirt_Center", new Vector3(0f, 1.08f, 0.002f), new Vector3(0.12f, 0.46f, 0.206f), shirtMat, false);
            AddBox(visuals.transform, "Belt_Waist", new Vector3(0f, 0.80f, 0f), new Vector3(0.35f, 0.06f, 0.202f), shoeMat, false);

            // Cordon y Fotocheck UNAB en el pecho
            AddBox(visuals.transform, "Lanyard_L", new Vector3(-0.04f, 1.20f, 0.106f), new Vector3(0.018f, 0.22f, 0.01f), lanyardMat, false)
                .transform.localEulerAngles = new Vector3(0f, 0f, -12f);
            AddBox(visuals.transform, "Lanyard_R", new Vector3(0.04f, 1.20f, 0.106f), new Vector3(0.018f, 0.22f, 0.01f), lanyardMat, false)
                .transform.localEulerAngles = new Vector3(0f, 0f, 12f);
            AddBox(visuals.transform, "ID_Badge_Holder", new Vector3(0f, 1.05f, 0.108f), new Vector3(0.065f, 0.09f, 0.012f), shirtMat, false);
            AddBox(visuals.transform, "ID_Badge_Header", new Vector3(0f, 1.08f, 0.109f), new Vector3(0.058f, 0.022f, 0.014f), lanyardMat, false);

            // Cuello y Cabeza
            AddCylinder(visuals.transform, "Neck", new Vector3(0f, 1.35f, 0f), new Vector3(0.11f, 0.04f, 0.11f), skinMat, false);
            GameObject headPivot = new GameObject("HeadPivot");
            headPivot.transform.SetParent(visuals.transform);
            headPivot.transform.localPosition = new Vector3(0f, 1.50f, 0f);

            AddBox(headPivot.transform, "Head", Vector3.zero, new Vector3(0.21f, 0.23f, 0.21f), skinMat, false);
            AddBox(headPivot.transform, "Hair_Top", new Vector3(0f, 0.095f, -0.005f), new Vector3(0.225f, 0.075f, 0.225f), hairMat, false);
            AddBox(headPivot.transform, "Hair_Back", new Vector3(0f, 0.02f, -0.085f), new Vector3(0.22f, 0.18f, 0.06f), hairMat, false);
            AddBox(headPivot.transform, "Hair_SideL", new Vector3(-0.102f, 0.03f, -0.01f), new Vector3(0.03f, 0.12f, 0.16f), hairMat, false);
            AddBox(headPivot.transform, "Hair_SideR", new Vector3(0.102f, 0.03f, -0.01f), new Vector3(0.03f, 0.12f, 0.16f), hairMat, false);
            // Lentes
            AddBox(headPivot.transform, "Glasses_Front", new Vector3(0f, 0.02f, 0.106f), new Vector3(0.17f, 0.038f, 0.02f), shoeMat, false);

            // Brazo Izquierdo Articulado
            GameObject leftArmPivot = new GameObject("LeftArmPivot");
            leftArmPivot.transform.SetParent(visuals.transform);
            leftArmPivot.transform.localPosition = new Vector3(-0.235f, 1.28f, 0f);
            AddBox(leftArmPivot.transform, "UpperArm_L", new Vector3(0f, -0.20f, 0f), new Vector3(0.10f, 0.44f, 0.10f), jacketMat, false);
            AddBox(leftArmPivot.transform, "Hand_L", new Vector3(0f, -0.45f, 0f), new Vector3(0.08f, 0.09f, 0.08f), skinMat, false);

            // Brazo Derecho Articulado
            GameObject rightArmPivot = new GameObject("RightArmPivot");
            rightArmPivot.transform.SetParent(visuals.transform);
            rightArmPivot.transform.localPosition = new Vector3(0.235f, 1.28f, 0f);
            AddBox(rightArmPivot.transform, "UpperArm_R", new Vector3(0f, -0.20f, 0f), new Vector3(0.10f, 0.44f, 0.10f), jacketMat, false);
            AddBox(rightArmPivot.transform, "Hand_R", new Vector3(0f, -0.45f, 0f), new Vector3(0.08f, 0.09f, 0.08f), skinMat, false);

            // Pierna Izquierda Articulada
            GameObject leftLegPivot = new GameObject("LeftLegPivot");
            leftLegPivot.transform.SetParent(visuals.transform);
            leftLegPivot.transform.localPosition = new Vector3(-0.095f, 0.78f, 0f);
            AddBox(leftLegPivot.transform, "Leg_L", new Vector3(0f, -0.35f, 0f), new Vector3(0.13f, 0.70f, 0.13f), pantsMat, false);
            AddBox(leftLegPivot.transform, "Shoe_L", new Vector3(0f, -0.74f, 0.035f), new Vector3(0.135f, 0.08f, 0.21f), shoeMat, false);

            // Pierna Derecha Articulada
            GameObject rightLegPivot = new GameObject("RightLegPivot");
            rightLegPivot.transform.SetParent(visuals.transform);
            rightLegPivot.transform.localPosition = new Vector3(0.095f, 0.78f, 0f);
            AddBox(rightLegPivot.transform, "Leg_R", new Vector3(0f, -0.35f, 0f), new Vector3(0.13f, 0.70f, 0.13f), pantsMat, false);
            AddBox(rightLegPivot.transform, "Shoe_R", new Vector3(0f, -0.74f, 0.035f), new Vector3(0.135f, 0.08f, 0.21f), shoeMat, false);

            ctrl.playerRoot = playerRoot.transform;
            ctrl.playerVisuals = visuals.transform;
            ctrl.playerHead = headPivot.transform;
            ctrl.playerLeftArmPivot = leftArmPivot.transform;
            ctrl.playerRightArmPivot = rightArmPivot.transform;
            ctrl.playerLeftLegPivot = leftLegPivot.transform;
            ctrl.playerRightLegPivot = rightLegPivot.transform;
            ctrl.isThirdPerson = true;
        }

        [MenuItem("UNAB Transporte/Reemplazar Avatar con Modelo 3D Seleccionado (FBX o Prefab)", false, 2)]
        public static void ReplaceAvatarWithSelectedModel()
        {
            GameObject selected = Selection.activeGameObject;
            if (selected == null)
            {
                EditorUtility.DisplayDialog("Seleccionar Modelo 3D",
                    "Primero selecciona en la ventana Project o Hierarchy el modelo 3D de tu personaje (por ejemplo un archivo .fbx descargado de Mixamo o un Prefab) y luego vuelve a hacer clic en esta opcion.",
                    "Entendido");
                return;
            }

            var ctrl = Object.FindAnyObjectByType<UNABSceneController>();
            if (ctrl == null || ctrl.playerVisuals == null)
            {
                EditorUtility.DisplayDialog("Escena no encontrada",
                    "Primero construye la escena con 'UNAB Transporte -> Construir Escena 3D Completa (1-Click)'.",
                    "OK");
                return;
            }

            for (int i = ctrl.playerVisuals.childCount - 1; i >= 0; i--)
            {
                Object.DestroyImmediate(ctrl.playerVisuals.GetChild(i).gameObject);
            }

            GameObject instance = (PrefabUtility.IsPartOfPrefabAsset(selected))
                ? (GameObject)PrefabUtility.InstantiatePrefab(selected, ctrl.playerVisuals)
                : Object.Instantiate(selected, ctrl.playerVisuals);

            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            instance.transform.localScale = Vector3.one;

            ctrl.playerLeftArmPivot = null;
            ctrl.playerRightArmPivot = null;
            ctrl.playerLeftLegPivot = null;
            ctrl.playerRightLegPivot = null;

            EditorUtility.DisplayDialog("Avatar 3D Actualizado",
                "¡Tu modelo 3D ahora es el personaje caminante de la escena! Presiona PLAY (▶) y usa WASD para caminar con el.",
                "¡Genial!");
        }
    }
}
#endif
