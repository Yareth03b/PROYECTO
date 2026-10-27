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
            if (GameObject.Find("UNAB_Transporte_Root") != null && GameObject.Find("UNAB_HD_V9_GiantCampusFacade") == null)
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

            GameObject marker = new GameObject("UNAB_HD_V9_GiantCampusFacade");
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
            mainCam.clearFlags = CameraClearFlags.Skybox;
            mainCam.backgroundColor = new Color(0.38f, 0.68f, 0.96f);
            mainCam.nearClipPlane = 0.1f;
            mainCam.farClipPlane = 240f;
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
            BuildUNABCampusAndFacade(root.transform, ctrl);
            BuildDataCenterRoom(root.transform, ctrl);
            BuildMonitoringOffice(root.transform, ctrl);
            BuildStructuredCabling(root.transform, ctrl);
            BuildPlayerAvatar(root.transform, ctrl);

            Selection.activeGameObject = root;
            SceneView.RepaintAll();
            if (showDialog)
            {
                EditorUtility.DisplayDialog(
                    "UNAB - Campus, Fachada Principal y Area de Transporte 3D",
                    "¡Campus de la Universidad Nacional de Barranca (Portico Principal, Mural de Caral, Torre Azul UNAB, Bus Institucional y Area de Transporte) construido!\n\nPresiona PLAY (▶) para caminar desde la fachada exterior hacia el Area de Transporte.",
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

        private static GameObject AddQuad(Transform parent, string name, Vector3 pos, Vector3 scale, Vector3 eulerAngles, Material mat)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.transform.localEulerAngles = eulerAngles;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            var c = go.GetComponent<Collider>();
            if (c != null) Object.DestroyImmediate(c);
            return go;
        }

        private static Texture2D LoadResourceTex(string resName, bool repeat = false)
        {
            Texture2D tex = Resources.Load<Texture2D>(resName);
            if (tex != null)
            {
                tex.anisoLevel = 8;
                tex.wrapMode = repeat ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            }
            return tex;
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
            RenderSettings.ambientSkyColor = new Color(0.84f, 0.89f, 0.96f);
            RenderSettings.ambientEquatorColor = new Color(0.64f, 0.70f, 0.78f);
            RenderSettings.ambientGroundColor = new Color(0.35f, 0.38f, 0.44f);

            Light dirLight = Object.FindAnyObjectByType<Light>();
            if (dirLight == null || dirLight.type != LightType.Directional)
            {
                GameObject dlObj = new GameObject("Sun_DirectionalLight");
                dlObj.transform.SetParent(lightGroup.transform, false);
                dirLight = dlObj.AddComponent<Light>();
                dirLight.type = LightType.Directional;
            }
            dirLight.transform.rotation = Quaternion.Euler(48f, -38f, 0f);
            dirLight.intensity = 1.45f;
            dirLight.color = new Color(1f, 0.98f, 0.94f);
            dirLight.shadows = LightShadows.Soft;

            // Luminarias interiores de techo para dar volumen, brillos especulares (PBR) y sombras suaves a los objetos
            void AddInteriorCeilingLight(string name, Vector3 pos, Color col, float intensity, float range, bool castShadows = false)
            {
                GameObject lo = new GameObject(name);
                lo.transform.SetParent(lightGroup.transform, false);
                lo.transform.localPosition = pos;
                Light l = lo.AddComponent<Light>();
                l.type = LightType.Point;
                l.color = col;
                l.intensity = intensity;
                l.range = range;
                l.shadows = castShadows ? LightShadows.Soft : LightShadows.None;
            }

            // Iluminacion Data Center (Blanco frio + acento azul cian en el Rack)
            AddInteriorCeilingLight("DC_CeilingLight_North", new Vector3(-5.6f, 2.95f, 2.6f), new Color(0.90f, 0.95f, 1.0f), 6.5f, 9.5f, true);
            AddInteriorCeilingLight("DC_CeilingLight_South", new Vector3(-5.6f, 2.95f, -2.6f), new Color(0.90f, 0.95f, 1.0f), 6.5f, 9.5f, false);
            AddInteriorCeilingLight("Rack_CyberGlow", new Vector3(-5.95f, 1.65f, -0.45f), new Color(0.18f, 0.62f, 1.0f), 4.2f, 5.5f, false);

            // Iluminacion Oficina de Monitoreo (Luz arquitectonica 4500K sobre escritorios y centro)
            AddInteriorCeilingLight("Office_Light_Desk1", new Vector3(0.85f, 2.95f, 2.8f), new Color(1.0f, 0.98f, 0.94f), 7.5f, 10.5f, true);
            AddInteriorCeilingLight("Office_Light_Desk2", new Vector3(5.40f, 2.95f, 2.8f), new Color(1.0f, 0.98f, 0.94f), 7.5f, 10.5f, false);
            AddInteriorCeilingLight("Office_Light_Admin", new Vector3(3.80f, 2.95f, -2.8f), new Color(1.0f, 0.98f, 0.94f), 7.5f, 10.5f, false);
            AddInteriorCeilingLight("Office_Light_Printer", new Vector3(-1.20f, 2.95f, -1.2f), new Color(0.98f, 0.98f, 1.0f), 6.0f, 9.0f, false);

            // Reflection Probes de alta resolucion para reflejos reales en vidrios, pisos de porcelanato y chasis metalicos
            void AddRoomProbe(string name, Vector3 pos, Vector3 size)
            {
                GameObject probeObj = new GameObject(name);
                probeObj.transform.SetParent(lightGroup.transform, false);
                probeObj.transform.localPosition = pos;
                ReflectionProbe probe = probeObj.AddComponent<ReflectionProbe>();
                probe.mode = ReflectionProbeMode.Realtime;
                probe.refreshMode = ReflectionProbeRefreshMode.OnAwake;
                probe.resolution = 256;
                probe.boxProjection = true;
                probe.size = size;
            }
            AddRoomProbe("Probe_MonitoringOffice", new Vector3(2.4f, 1.75f, 0f), new Vector3(12f, 4.2f, 11.5f));
            AddRoomProbe("Probe_DataCenter", new Vector3(-5.6f, 1.75f, 0f), new Vector3(5.5f, 4.2f, 11.5f));
        }

        private static void BuildEnvironmentAndWalls(Transform root, UNABSceneController ctrl)
        {
            GameObject env = new GameObject("Architecture_And_Walls");
            env.transform.SetParent(root, false);

            Material grassMat = CreatePbrMat("Grass", new Color(0.35f, 0.58f, 0.12f), 0f, 0.15f);
            AddBox(env.transform, "Exterior_Grass", new Vector3(4f, -0.10f, 0f), new Vector3(84f, 0.08f, 80f), grassMat, false);

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

        // ==========================================================================================================
        // CAMPUS Y FACHADA EXTERIOR MONUMENTAL DE LA UNIVERSIDAD NACIONAL DE BARRANCA (ESCALA ARQUITECTONICA REAL)
        // ==========================================================================================================
        private static void BuildUNABCampusAndFacade(Transform root, UNABSceneController ctrl)
        {
            GameObject campus = new GameObject("UNAB_Campus_And_Facade");
            campus.transform.SetParent(root, false);

            // Texturas fotograficas y arquitectonicas desde Assets/Resources/
            Texture2D slateTex = LoadResourceTex("piedra-laja-unab", true);
            Texture2D porticoHdrTex = LoadResourceTex("portico-unab-header", false);
            Texture2D towerUnabTex = LoadResourceTex("torre-unab-vertical", false);
            Texture2D caralMuralTex = LoadResourceTex("mural-caral", false);
            Texture2D caralRelievesTex = LoadResourceTex("relieves-caral", false);
            Texture2D caralPlacaTex = LoadResourceTex("placa-caral-texto", false);

            Material slateMat = CreatePbrMat("UNAB_SlateStone", Color.white, 0.12f, 0.38f, slateTex, new Vector2(6f, 5f));
            Material slatePillarMat = CreatePbrMat("UNAB_SlatePillar", Color.white, 0.12f, 0.42f, slateTex, new Vector2(2.5f, 4f));
            Material porticoHdrMat = CreatePbrMat("UNAB_PorticoHeader", Color.white, 0.25f, 0.55f, porticoHdrTex);
            Material towerBlueMat = CreatePbrMat("UNAB_BlueTower", new Color(0.05f, 0.20f, 0.72f), 0.15f, 0.65f);
            Material towerSignMat = CreatePbrMat("UNAB_TowerSign", Color.white, 0.15f, 0.65f, towerUnabTex);
            Material caralMuralMat = CreatePbrMat("UNAB_CaralMural", Color.white, 0.04f, 0.28f, caralMuralTex);
            Material caralRelievesMat = CreatePbrMat("UNAB_CaralRelieves", Color.white, 0.05f, 0.30f, caralRelievesTex);
            Material caralPlacaMat = CreatePbrMat("UNAB_CaralPlaca", Color.white, 0.05f, 0.32f, caralPlacaTex);

            Material grassExtMat = CreatePbrMat("CampusGrassExt", new Color(0.35f, 0.58f, 0.12f), 0f, 0.15f);
            Material concreteLightMat = CreatePbrMat("CampusConcrete", new Color(0.84f, 0.85f, 0.83f), 0.04f, 0.30f);
            Material sidewalkMat = CreatePbrMat("SidewalkConcrete", new Color(0.75f, 0.76f, 0.74f), 0.04f, 0.32f);
            Material asphaltMat = CreatePbrMat("AvenueAsphalt", new Color(0.16f, 0.17f, 0.19f), 0.06f, 0.28f);
            Material yellowCurbMat = CreatePbrMat("TrafficYellowCurb", new Color(0.95f, 0.74f, 0.05f), 0.08f, 0.48f);
            Material ochreWallMat = CreatePbrMat("PerimeterOchre", new Color(0.92f, 0.72f, 0.22f), 0.04f, 0.35f);
            Material beigeWallMat = CreatePbrMat("CaralWallBeige", new Color(0.87f, 0.84f, 0.76f), 0.04f, 0.32f);
            Material whiteConcreteMat = CreatePbrMat("PavilionWhite", new Color(0.96f, 0.97f, 0.98f), 0.04f, 0.48f);
            Material cyanAccentMat = CreatePbrMat("UNAB_CyanAccent", new Color(0.02f, 0.62f, 0.90f), 0.20f, 0.65f);
            Material fenceGrayMat = CreatePbrMat("FenceSteelGray", new Color(0.46f, 0.49f, 0.53f), 0.65f, 0.55f);
            Material glassReflectMat = CreatePbrMat("CampusCurtainGlass", new Color(0.45f, 0.76f, 0.96f, 0.78f), 0.80f, 0.94f, MakeReflectiveGlassTex(), Vector2.one, true, new Color(0.02f, 0.12f, 0.22f));
            Material darkMullionMat = CreatePbrMat("DarkMullion", new Color(0.10f, 0.12f, 0.15f), 0.5f, 0.65f);
            Material trunkMat = CreatePbrMat("TreeTrunkBrown", new Color(0.36f, 0.24f, 0.14f), 0.02f, 0.2f);
            Material foliageMat = CreatePbrMat("TreeFoliageGreen", new Color(0.18f, 0.46f, 0.14f), 0.02f, 0.28f);
            Material warmLightMat = CreatePbrMat("SpotlightWarm", Color.white, 0f, 0.9f, null, null, false, new Color(1.0f, 0.95f, 0.82f) * 2.2f);

            // 1. GRAN EXPLANADA DEL CAMPUS UNAB (110m DE FRENTE) Y AVENIDA EXTERIOR DE BARRANCA
            AddBox(campus.transform, "Extended_Campus_Ground", new Vector3(12f, -0.09f, 4f), new Vector3(130f, 0.06f, 130f), grassExtMat, false);
            AddBox(campus.transform, "Campus_Courtyard_Floor", new Vector3(6.5f, -0.03f, 2f), new Vector3(37.0f, 0.06f, 108.0f), concreteLightMat, false);

            // Alameda peatonal principal desde el Gran Portico (x=25.0) hasta la entrada del Area de Transporte (x=8.0)
            AddBox(campus.transform, "Walkway_To_Transporte", new Vector3(16.5f, 0.005f, 0f), new Vector3(16.8f, 0.02f, 7.6f), sidewalkMat, false);
            AddBox(campus.transform, "Walkway_Curb_L", new Vector3(16.5f, 0.04f, -3.85f), new Vector3(16.6f, 0.08f, 0.18f), yellowCurbMat, false);
            AddBox(campus.transform, "Walkway_Curb_R", new Vector3(16.5f, 0.04f, 3.85f), new Vector3(16.6f, 0.08f, 0.18f), yellowCurbMat, false);

            // Vereda exterior ancha, sardinel amarillo y Avenida asfaltada de doble via (120 metros de largo)
            AddBox(campus.transform, "Exterior_Sidewalk", new Vector3(27.2f, 0.02f, 4.0f), new Vector3(4.2f, 0.08f, 118.0f), sidewalkMat, false);
            AddBox(campus.transform, "Exterior_YellowCurb", new Vector3(29.28f, 0.05f, 4.0f), new Vector3(0.22f, 0.12f, 118.0f), yellowCurbMat, false);
            AddBox(campus.transform, "Exterior_Avenue_Asphalt", new Vector3(38.0f, -0.02f, 4.0f), new Vector3(17.5f, 0.06f, 120.0f), asphaltMat, false);
            // Lineas blancas de la avenida (continua lateral y segmentada central)
            AddBox(campus.transform, "Road_Line_Edge1", new Vector3(29.85f, 0.015f, 4.0f), new Vector3(0.16f, 0.01f, 118.0f), whiteConcreteMat, false);
            AddBox(campus.transform, "Road_Line_Edge2", new Vector3(45.80f, 0.015f, 4.0f), new Vector3(0.16f, 0.01f, 118.0f), whiteConcreteMat, false);
            for (float rz = -50f; rz <= 56f; rz += 4.5f)
            {
                AddBox(campus.transform, "Road_Line_CenterDash", new Vector3(37.8f, 0.015f, rz), new Vector3(0.18f, 0.01f, 2.4f), whiteConcreteMat, false);
            }

            // 2. PABELLON CENTRAL UNAB DE 4 PISOS (CON AREA DE TRANSPORTE EN EL 1ER PISO + TORRE AZUL GIGANTE "U N A B")
            GameObject entranceCanopy = new GameObject("Canopy_Area_Transporte");
            entranceCanopy.transform.SetParent(campus.transform, false);
            entranceCanopy.transform.localPosition = new Vector3(8.16f, 3.22f, 0f);
            AddBox(entranceCanopy.transform, "Canopy_Slab", new Vector3(0.45f, -0.18f, 0f), new Vector3(1.1f, 0.12f, 5.2f), whiteConcreteMat, false);
            AddBox(entranceCanopy.transform, "Sign_Backing", new Vector3(0.10f, 0.22f, 0f), new Vector3(0.14f, 0.56f, 5.0f), slatePillarMat, false);
            AddBox(entranceCanopy.transform, "Sign_CyanStrip", new Vector3(0.175f, -0.02f, 0f), new Vector3(0.02f, 0.08f, 5.0f), cyanAccentMat, false);
            AddLabel(ctrl, "Pabellon Central (1er Piso): Area de Transporte y Data Center", new Vector3(8.45f, 3.55f, 0f));

            // La iconica Torre Azul Real Vertical "U N A B" a escala monumental (16.5m de alto x 3.6m de ancho)
            GameObject blueTower = new GameObject("Torre_Azul_UNAB");
            blueTower.transform.SetParent(campus.transform, false);
            blueTower.transform.localPosition = new Vector3(6.8f, 0f, -7.4f);
            AddBox(blueTower.transform, "Tower_Core", new Vector3(0f, 8.25f, 0f), new Vector3(3.6f, 16.5f, 3.2f), towerBlueMat, false);
            AddQuad(blueTower.transform, "UNAB_Vertical_Front", new Vector3(1.82f, 8.6f, 0f), new Vector3(3.0f, 14.2f, 1f), new Vector3(0f, -90f, 0f), towerSignMat);
            AddQuad(blueTower.transform, "UNAB_Vertical_Side", new Vector3(0f, 8.6f, 1.62f), new Vector3(3.3f, 14.2f, 1f), new Vector3(0f, 180f, 0f), towerSignMat);

            // Alas laterales del Pabellon Central para darle 28 metros de frente monumental
            AddBox(campus.transform, "CentralPavilion_LeftWing", new Vector3(0f, 7.2f, -12.5f), new Vector3(16.2f, 14.4f, 7.2f), whiteConcreteMat, false);
            AddBox(campus.transform, "CentralPavilion_LeftWing_Glass", new Vector3(8.15f, 7.2f, -12.5f), new Vector3(0.14f, 12.6f, 6.4f), glassReflectMat, false);
            AddBox(campus.transform, "CentralPavilion_RightWing", new Vector3(0f, 7.2f, 9.2f), new Vector3(16.2f, 14.4f, 7.2f), whiteConcreteMat, false);
            AddBox(campus.transform, "CentralPavilion_RightWing_Glass", new Vector3(8.15f, 7.2f, 9.2f), new Vector3(0.14f, 12.6f, 6.4f), glassReflectMat, false);

            // Pisos 2, 3 y 4 directamente sobre el Area de Transporte (Emparentados a ctrl.ceilingGroup para ocultarse cuando Techo: OFF)
            if (ctrl.ceilingGroup != null)
            {
                GameObject upperFloors = new GameObject("Pabellon_Central_UpperFloors");
                upperFloors.transform.SetParent(ctrl.ceilingGroup.transform, false);

                AddBox(upperFloors.transform, "Slab_Floor2", new Vector3(0f, 3.75f, 0f), new Vector3(16.6f, 0.28f, 11.6f), whiteConcreteMat, false);
                AddBox(upperFloors.transform, "Slab_Floor3", new Vector3(0f, 7.35f, 0f), new Vector3(16.6f, 0.28f, 11.6f), whiteConcreteMat, false);
                AddBox(upperFloors.transform, "Slab_Floor4", new Vector3(0f, 10.95f, 0f), new Vector3(16.6f, 0.28f, 11.6f), whiteConcreteMat, false);
                AddBox(upperFloors.transform, "Slab_Roof", new Vector3(0f, 14.40f, 0f), new Vector3(16.8f, 0.32f, 11.8f), whiteConcreteMat, false);

                // Muro cortina de vidrio azul reflectivo en los pisos 2, 3 y 4
                AddBox(upperFloors.transform, "UpperGlass_Front", new Vector3(7.95f, 9.05f, 0f), new Vector3(0.14f, 10.4f, 10.8f), glassReflectMat, false);
                AddBox(upperFloors.transform, "UpperGlass_North", new Vector3(0f, 9.05f, 5.44f), new Vector3(15.6f, 10.4f, 0.14f), glassReflectMat, false);
                AddBox(upperFloors.transform, "UpperGlass_South", new Vector3(0f, 9.05f, -5.44f), new Vector3(15.6f, 10.4f, 0.14f), glassReflectMat, false);
                AddBox(upperFloors.transform, "UpperWall_Back", new Vector3(-7.96f, 9.05f, 0f), new Vector3(0.28f, 10.4f, 11.4f), whiteConcreteMat, false);

                // Columnas blancas y pergola de azotea tipicas del Pabellon UNAB (Fotos 1, 4 y 5)
                for (float cz = -5.4f; cz <= 5.4f; cz += 2.7f)
                {
                    AddBox(upperFloors.transform, "WhiteCol_Front", new Vector3(8.14f, 9.05f, cz), new Vector3(0.34f, 10.8f, 0.34f), whiteConcreteMat, false);
                    AddBox(upperFloors.transform, "RoofPergola_Col", new Vector3(8.14f, 15.35f, cz), new Vector3(0.28f, 1.7f, 0.28f), whiteConcreteMat, false);
                }
                AddBox(upperFloors.transform, "RoofPergola_Beam", new Vector3(8.14f, 16.20f, 0f), new Vector3(0.36f, 0.26f, 11.6f), whiteConcreteMat, false);
            }

            // 3. GRAN PABELLON IZQUIERDO DE PIEDRA LAJA OSCURA Y MARCO CELESTE (FOTOS 2 Y 3 - ESCALA MONUMENTAL)
            GameObject leftPavilion = new GameObject("Pabellon_PiedraLaja_Izquierdo");
            leftPavilion.transform.SetParent(campus.transform, false);
            leftPavilion.transform.localPosition = new Vector3(18.5f, 0f, -21.5f);
            AddBox(leftPavilion.transform, "Slate_MainVolume", new Vector3(0f, 7.6f, 0f), new Vector3(11.8f, 15.2f, 18.5f), slateMat, false);
            AddBox(leftPavilion.transform, "Glass_InnerFace", new Vector3(-0.3f, 7.4f, 9.32f), new Vector3(10.2f, 13.2f, 0.14f), glassReflectMat, false);
            AddBox(leftPavilion.transform, "CyanFrame_Top", new Vector3(0f, 14.3f, 9.38f), new Vector3(11.0f, 0.42f, 0.24f), cyanAccentMat, false);
            AddBox(leftPavilion.transform, "CyanFrame_Right", new Vector3(5.3f, 7.4f, 9.38f), new Vector3(0.42f, 14.2f, 0.24f), cyanAccentMat, false);

            // 4. GRAN AUDITORIO DETRAS DEL MURAL DE CARAL (TECHO A DOS AGUAS - FOTO 1) Y PABELLON DERECHO (FOTOS 2 Y 5)
            GameObject rightAudit = new GameObject("Auditorio_Y_Pabellon_Derecho");
            rightAudit.transform.SetParent(campus.transform, false);
            // Nave del auditorio detras del gran mural de Caral (z = +19.5 a +46.5, 27 metros de largo)
            AddBox(rightAudit.transform, "Auditorium_Body", new Vector3(15.5f, 3.8f, 33.0f), new Vector3(18.0f, 7.6f, 26.8f), whiteConcreteMat, false);
            Material roofBeigeMat = CreatePbrMat("AuditoriumRoof", new Color(0.78f, 0.72f, 0.66f), 0.15f, 0.35f);
            AddBox(rightAudit.transform, "GableRoof_Slope1", new Vector3(15.5f, 8.35f, 26.4f), new Vector3(18.4f, 0.24f, 13.8f), roofBeigeMat, false)
                .transform.localEulerAngles = new Vector3(11f, 0f, 0f);
            AddBox(rightAudit.transform, "GableRoof_Slope2", new Vector3(15.5f, 8.35f, 39.6f), new Vector3(18.4f, 0.24f, 13.8f), roofBeigeMat, false)
                .transform.localEulerAngles = new Vector3(-11f, 0f, 0f);

            // Pabellon moderno derecho de 4 pisos (visible al fondo en las Fotos 1, 2 y 5)
            AddBox(rightAudit.transform, "ModernRight_Building", new Vector3(2.5f, 7.8f, 28.0f), new Vector3(14.5f, 15.6f, 24.0f), whiteConcreteMat, false);
            AddBox(rightAudit.transform, "ModernRight_Glass", new Vector3(9.85f, 7.8f, 28.0f), new Vector3(0.16f, 13.2f, 21.5f), glassReflectMat, false);

            // 5. EL GRAN PORTICO PRINCIPAL DE INGRESO MONUMENTAL (23m DE ANCHO X 8.6m DE ALTO - FOTOS 2, 3 Y 4)
            GameObject portico = new GameObject("Portico_Principal_UNAB");
            portico.transform.SetParent(campus.transform, false);
            portico.transform.localPosition = new Vector3(25.0f, 0f, 0f);

            // Pilares trapezoidales inclinados gigantes en piedra laja negra a izquierda (z=-10.2) y derecha (z=+10.2)
            AddBox(portico.transform, "Pilar_Izquierdo_Base", new Vector3(0f, 0.24f, -10.35f), new Vector3(2.45f, 0.48f, 2.55f), yellowCurbMat, false);
            GameObject pilarIzq = AddBox(portico.transform, "Pilar_Izquierdo_Piedra", new Vector3(0f, 4.25f, -10.15f), new Vector3(2.20f, 8.20f, 2.10f), slatePillarMat, false);
            pilarIzq.transform.localEulerAngles = new Vector3(-7.5f, 0f, 0f);

            AddBox(portico.transform, "Pilar_Derecho_Base", new Vector3(0f, 0.24f, 10.35f), new Vector3(2.45f, 0.48f, 2.55f), yellowCurbMat, false);
            GameObject pilarDer = AddBox(portico.transform, "Pilar_Derecho_Piedra", new Vector3(0f, 4.25f, 10.15f), new Vector3(2.20f, 8.20f, 2.10f), slatePillarMat, false);
            pilarDer.transform.localEulerAngles = new Vector3(7.5f, 0f, 0f);

            // Viga superior monumental revestida en piedra laja negra (23.2m de largo x 2.15m de alto)
            AddBox(portico.transform, "Viga_Superior_Piedra", new Vector3(0f, 7.55f, 0f), new Vector3(2.25f, 2.15f, 23.2f), slateMat, false);
            // Plafon blanco inferior con dicroicos LED empotrados (Fotos 2 y 3)
            AddBox(portico.transform, "Plafon_Blanco_Soffit", new Vector3(0f, 6.46f, 0f), new Vector3(2.12f, 0.06f, 19.2f), whiteConcreteMat, false);
            for (float lz = -7.8f; lz <= 7.8f; lz += 2.6f)
            {
                AddCylinder(portico.transform, "Downlight_LED", new Vector3(0f, 6.42f, lz), new Vector3(0.26f, 0.015f, 0.26f), warmLightMat, false);
            }

            // Friso frontal gigante con letras doradas "UNIVERSIDAD NACIONAL DE BARRANCA" y Escudo 3D UNAB (21.6m x 2.04m)
            AddQuad(portico.transform, "Friso_Letras_UNAB", new Vector3(1.14f, 7.55f, 0f), new Vector3(21.6f, 2.04f, 1f), new Vector3(0f, -90f, 0f), porticoHdrMat);
            // Volumen 3D adicional para el Escudo de la UNAB a la derecha del friso
            AddBox(portico.transform, "Escudo_UNAB_3D_Box", new Vector3(1.18f, 7.55f, 8.12f), new Vector3(0.16f, 1.35f, 0.30f), cyanAccentMat, false);
            AddBox(portico.transform, "Escudo_UNAB_3D_Main", new Vector3(1.16f, 7.55f, 8.62f), new Vector3(0.14f, 1.35f, 0.72f), towerBlueMat, false);

            // 2 Reflectores LED superiores con brazo metalico sobre la viga (Fotos 2 y 3)
            float[] floodZ = { -4.6f, 4.6f };
            foreach (float fz in floodZ)
            {
                AddCylinder(portico.transform, "Floodlight_Mast", new Vector3(0.3f, 9.15f, fz), new Vector3(0.06f, 0.55f, 0.06f), darkMullionMat, false);
                AddCylinder(portico.transform, "Floodlight_Arm", new Vector3(0.85f, 9.65f, fz), new Vector3(0.05f, 0.60f, 0.05f), darkMullionMat, false)
                    .transform.localEulerAngles = new Vector3(0f, 0f, 90f);
                AddBox(portico.transform, "Floodlight_Lamp", new Vector3(1.38f, 9.60f, fz), new Vector3(0.28f, 0.09f, 0.44f), warmLightMat, false);
            }

            // Muro amarillo central con jardinera y arbustos + Rejas metalicas grises de 4.0m de alto
            AddBox(portico.transform, "Central_YellowWall", new Vector3(0f, 1.80f, 0f), new Vector3(0.38f, 3.60f, 3.40f), ochreWallMat, false);
            AddBox(portico.transform, "Central_PlanterBox", new Vector3(0.55f, 0.32f, 0f), new Vector3(0.82f, 0.64f, 3.48f), yellowCurbMat, false);
            for (int b = -1; b <= 1; b++)
            {
                AddSphere(portico.transform, "Planter_Bush", new Vector3(0.60f, 1.05f, b * 0.95f), new Vector3(1.05f, 1.15f, 1.05f), foliageMat);
            }

            // Funcion auxiliar para construir panos de reja metalica gris de 4.0m de alto con barrotes verticales
            void BuildFencePanel(Transform parent, Vector3 pos, float widthZ, float heightY = 4.0f, float rotY = 0f)
            {
                GameObject fp = new GameObject("Fence_Panel");
                fp.transform.SetParent(parent, false);
                fp.transform.localPosition = pos;
                fp.transform.localEulerAngles = new Vector3(0f, rotY, 0f);

                AddBox(fp.transform, "Rail_Top", new Vector3(0f, heightY - 0.15f, 0f), new Vector3(0.08f, 0.08f, widthZ), fenceGrayMat, false);
                AddBox(fp.transform, "Rail_Mid", new Vector3(0f, heightY * 0.5f, 0f), new Vector3(0.08f, 0.07f, widthZ), fenceGrayMat, false);
                AddBox(fp.transform, "Rail_Bot", new Vector3(0f, 0.24f, 0f), new Vector3(0.08f, 0.08f, widthZ), fenceGrayMat, false);
                int bars = Mathf.Max(3, Mathf.FloorToInt(widthZ / 0.22f));
                for (int i = 0; i <= bars; i++)
                {
                    float bz = -widthZ * 0.5f + ((float)i / bars) * widthZ;
                    AddBox(fp.transform, "Bar_V", new Vector3(0f, heightY * 0.5f + 0.05f, bz), new Vector3(0.045f, heightY, 0.045f), fenceGrayMat, false);
                }
            }

            // Rejas laterales fijas y hojas abiertas de 3.2m hacia el interior para paso amplio
            BuildFencePanel(portico.transform, new Vector3(0f, 0f, -7.45f), 3.5f, 4.0f);
            BuildFencePanel(portico.transform, new Vector3(0f, 0f, 7.45f), 3.5f, 4.0f);
            BuildFencePanel(portico.transform, new Vector3(-1.55f, 0f, -5.55f), 3.1f, 4.0f, 82f);
            BuildFencePanel(portico.transform, new Vector3(-1.55f, 0f, 5.55f), 3.1f, 4.0f, -82f);

            // Vallas amarillas de control peatonal en los extremos (Foto 2)
            float[] barrierZ = { -7.5f, 7.5f };
            foreach (float bz in barrierZ)
            {
                AddBox(portico.transform, "YellowBarrier_Top", new Vector3(1.65f, 1.15f, bz), new Vector3(0.06f, 0.06f, 3.0f), yellowCurbMat, false);
                AddBox(portico.transform, "YellowBarrier_Bot", new Vector3(1.65f, 0.30f, bz), new Vector3(0.06f, 0.06f, 3.0f), yellowCurbMat, false);
                for (float vx = -1.35f; vx <= 1.35f; vx += 0.45f)
                    AddBox(portico.transform, "YellowBarrier_Bar", new Vector3(1.65f, 0.72f, bz + vx), new Vector3(0.04f, 0.82f, 0.04f), yellowCurbMat, false);
            }

            TagInteractable(portico, "portico_unab");
            AddLabel(ctrl, "Portico Principal - Universidad Nacional de Barranca", new Vector3(26.2f, 8.95f, 0f));

            // 6. MURO PERIMETRICO MONUMENTAL CON LOS 4 RELIEVES Y EL GIGANTESCO MURAL DE CARAL (43 METROS DE LARGO - FOTO 1)
            GameObject caralWall = new GameObject("Muro_Monumental_Caral");
            caralWall.transform.SetParent(campus.transform, false);
            caralWall.transform.localPosition = new Vector3(25.0f, 0f, 0f);

            // Tramo 1 (z = +11.6 a +19.6, 8.0m de largo x 4.8m de alto): Muro de los 4 paneles verticales con relieves de Caral
            AddBox(caralWall.transform, "Wall_Relieves_Body", new Vector3(0f, 2.40f, 15.6f), new Vector3(0.45f, 4.80f, 8.0f), beigeWallMat, false);
            AddQuad(caralWall.transform, "Quad_4_Relieves_Caral", new Vector3(0.25f, 2.40f, 15.6f), new Vector3(7.5f, 4.20f, 1f), new Vector3(0f, -90f, 0f), caralRelievesMat);

            // Tramo 2 (z = +19.6 a +46.6, ¡27 METROS de largo x 7.8 METROS de alto!): Gran Mural de la Ciudad Sagrada de Caral
            AddBox(caralWall.transform, "Wall_CaralMural_Body", new Vector3(0f, 3.90f, 33.1f), new Vector3(0.55f, 7.80f, 27.0f), beigeWallMat, false);
            AddQuad(caralWall.transform, "Quad_Mural_Ciudad_Sagrada_Caral", new Vector3(0.30f, 3.95f, 33.1f), new Vector3(26.4f, 7.35f, 1f), new Vector3(0f, -90f, 0f), caralMuralMat);

            // Tramo 3 (z = +46.6 a +55.0, 8.4m de largo x 4.8m de alto): Muro con la inscripcion "CARAL Primera Civilizacion de America"
            AddBox(caralWall.transform, "Wall_CaralText_Body", new Vector3(0f, 2.40f, 50.8f), new Vector3(0.45f, 4.80f, 8.4f), beigeWallMat, false);
            AddQuad(caralWall.transform, "Quad_Placa_Texto_Caral", new Vector3(0.25f, 2.30f, 50.6f), new Vector3(7.6f, 3.85f, 1f), new Vector3(0f, -90f, 0f), caralPlacaMat);

            // Muro perimetrico izquierdo con rejas altas (z = -11.6 a -44.0, 32.4m de largo)
            AddBox(caralWall.transform, "Wall_LeftPerimeter_Low", new Vector3(0f, 0.85f, -27.8f), new Vector3(0.42f, 1.70f, 32.4f), ochreWallMat, false);
            BuildFencePanel(caralWall.transform, new Vector3(0f, 1.5f, -19.5f), 14.5f, 3.2f);
            BuildFencePanel(caralWall.transform, new Vector3(0f, 1.5f, -35.5f), 14.5f, 3.2f);

            TagInteractable(caralWall, "portico_unab");
            AddLabel(ctrl, "Mural Monumental Ciudad Sagrada de Caral (27m)", new Vector3(25.8f, 8.15f, 33.1f));

            // Arboles ornamentales en alcorques de sardinel amarillo y postes de luz curvados altos en la vereda (Foto 1)
            float[] treeZ = { -14.5f, 13.5f, 38.5f };
            foreach (float tz in treeZ)
            {
                GameObject treePit = new GameObject($"Sidewalk_Tree_{tz}");
                treePit.transform.SetParent(campus.transform, false);
                treePit.transform.localPosition = new Vector3(28.1f, 0.06f, tz);
                AddBox(treePit.transform, "YellowCurbPit", new Vector3(0f, 0.08f, 0f), new Vector3(1.65f, 0.18f, 2.15f), yellowCurbMat, false);
                AddBox(treePit.transform, "Soil", new Vector3(0f, 0.10f, 0f), new Vector3(1.38f, 0.19f, 1.88f), trunkMat, false);
                AddCylinder(treePit.transform, "Trunk", new Vector3(0f, 1.65f, 0f), new Vector3(0.24f, 1.55f, 0.24f), trunkMat, false);
                AddSphere(treePit.transform, "Canopy_Main", new Vector3(0f, 3.45f, 0f), new Vector3(2.45f, 2.10f, 2.45f), foliageMat);
                AddSphere(treePit.transform, "Canopy_Sub1", new Vector3(0.55f, 3.15f, 0.55f), new Vector3(1.75f, 1.65f, 1.75f), foliageMat);
                AddSphere(treePit.transform, "Canopy_Sub2", new Vector3(-0.55f, 3.20f, -0.45f), new Vector3(1.85f, 1.65f, 1.85f), foliageMat);
            }

            float[] poleZ = { -17.5f, 18.0f, 41.5f };
            foreach (float pz in poleZ)
            {
                GameObject pole = new GameObject($"StreetLamp_{pz}");
                pole.transform.SetParent(campus.transform, false);
                pole.transform.localPosition = new Vector3(28.5f, 0f, pz);
                AddCylinder(pole.transform, "Pole_Vertical", new Vector3(0f, 3.8f, 0f), new Vector3(0.15f, 3.8f, 0.15f), whiteConcreteMat, false);
                AddCylinder(pole.transform, "Pole_Arm", new Vector3(0.85f, 7.65f, 0f), new Vector3(0.11f, 0.95f, 0.11f), whiteConcreteMat, false)
                    .transform.localEulerAngles = new Vector3(0f, 0f, -72f);
                AddBox(pole.transform, "LED_Luminaria", new Vector3(1.72f, 7.90f, 0f), new Vector3(0.68f, 0.10f, 0.34f), warmLightMat, false);
            }

            // 7. EL BUS INSTITUCIONAL DE LA UNAB EN 3D ESTACIONADO EN LA AVENIDA (FOTO 5)
            BuildUNABInstitutionalBus(campus.transform, ctrl, new Vector3(32.2f, 0.01f, 26.5f));
        }

        private static void BuildUNABInstitutionalBus(Transform parent, UNABSceneController ctrl, Vector3 pos)
        {
            GameObject bus = new GameObject("Bus_Institucional_UNAB_03");
            bus.transform.SetParent(parent, false);
            bus.transform.localPosition = pos;
            // Mirando hacia -Z (en direccion al Portico Principal de la UNAB, tal como en la Foto 5)
            bus.transform.localEulerAngles = new Vector3(0f, 180f, 0f);
            bus.transform.localScale = new Vector3(1.22f, 1.22f, 1.25f);

            Material busBlueMat = CreatePbrMat("BusUNAB_Blue", new Color(0.02f, 0.36f, 0.78f), 0.35f, 0.78f);
            Material busCyanMat = CreatePbrMat("BusUNAB_Cyan", new Color(0.05f, 0.68f, 0.95f), 0.30f, 0.75f);
            Material busWhiteMat = CreatePbrMat("BusUNAB_White", new Color(0.96f, 0.97f, 0.99f), 0.25f, 0.78f);
            Material busGlassMat = CreatePbrMat("BusTintedGlass", new Color(0.06f, 0.12f, 0.18f), 0.85f, 0.95f);
            Material tireMat = CreatePbrMat("BusTireRubber", new Color(0.08f, 0.08f, 0.09f), 0.05f, 0.25f);
            Material rimMat = CreatePbrMat("BusWheelRim", new Color(0.75f, 0.78f, 0.82f), 0.85f, 0.78f);
            Material headlightMat = CreatePbrMat("BusHeadlight", Color.white, 0f, 0.95f, null, null, false, new Color(0.95f, 0.98f, 1.0f) * 2.5f);
            Material taillightMat = CreatePbrMat("BusTaillight", new Color(0.95f, 0.1f, 0.1f), 0f, 0.9f, null, null, false, new Color(1.0f, 0.12f, 0.08f) * 2.0f);
            Material gpsBeaconMat = CreatePbrMat("BusGpsBeacon", new Color(0.05f, 0.92f, 0.98f), 0f, 0.9f, null, null, false, new Color(0.05f, 0.88f, 1.0f) * 2.8f);

            // Carroceria principal
            AddBox(bus.transform, "Body_LowerBlue", new Vector3(0f, 0.88f, 0f), new Vector3(2.42f, 0.96f, 8.20f), busBlueMat, true);
            AddBox(bus.transform, "Body_MidCyanStripe", new Vector3(0f, 1.42f, 0f), new Vector3(2.44f, 0.16f, 8.22f), busCyanMat, false);
            AddBox(bus.transform, "Body_UpperWhite", new Vector3(0f, 2.15f, 0f), new Vector3(2.40f, 1.32f, 8.16f), busWhiteMat, false);
            AddBox(bus.transform, "Roof_Cap", new Vector3(0f, 2.84f, 0f), new Vector3(2.26f, 0.10f, 7.90f), busWhiteMat, false);
            AddBox(bus.transform, "Roof_BlueStripe", new Vector3(0f, 2.74f, 0f), new Vector3(2.41f, 0.14f, 8.18f), busBlueMat, false);

            // Parabrisas panoramico delantero (+Z local) y medallon trasero (-Z local)
            AddBox(bus.transform, "Windshield_Front", new Vector3(0f, 2.02f, 4.06f), new Vector3(2.18f, 1.08f, 0.08f), busGlassMat, false);
            AddBox(bus.transform, "Destination_Display", new Vector3(0f, 2.64f, 4.07f), new Vector3(1.65f, 0.22f, 0.08f), tireMat, false);
            AddBox(bus.transform, "Rear_Window", new Vector3(0f, 2.08f, -4.06f), new Vector3(2.05f, 0.85f, 0.08f), busGlassMat, false);

            // Ventanas panoramicas laterales con parantes negros
            AddBox(bus.transform, "SideGlass_Left", new Vector3(-1.21f, 2.05f, -0.1f), new Vector3(0.04f, 0.92f, 7.2f), busGlassMat, false);
            AddBox(bus.transform, "SideGlass_Right", new Vector3(1.21f, 2.05f, -0.1f), new Vector3(0.04f, 0.92f, 7.2f), busGlassMat, false);
            for (float wz = -3.1f; wz <= 3.1f; wz += 1.05f)
            {
                AddBox(bus.transform, "Pillar_L", new Vector3(-1.22f, 2.05f, wz), new Vector3(0.05f, 0.94f, 0.08f), tireMat, false);
                AddBox(bus.transform, "Pillar_R", new Vector3(1.22f, 2.05f, wz), new Vector3(0.05f, 0.94f, 0.08f), tireMat, false);
            }

            // Parachoques, faros LED delanteros, luces traseras y espejos retrovisores
            AddBox(bus.transform, "Bumper_Front", new Vector3(0f, 0.42f, 4.14f), new Vector3(2.44f, 0.24f, 0.16f), rimMat, false);
            AddBox(bus.transform, "Bumper_Rear", new Vector3(0f, 0.42f, -4.14f), new Vector3(2.44f, 0.24f, 0.16f), rimMat, false);
            AddBox(bus.transform, "Headlight_L", new Vector3(-0.88f, 0.72f, 4.11f), new Vector3(0.36f, 0.18f, 0.06f), headlightMat, false);
            AddBox(bus.transform, "Headlight_R", new Vector3(0.88f, 0.72f, 4.11f), new Vector3(0.36f, 0.18f, 0.06f), headlightMat, false);
            AddBox(bus.transform, "Taillight_L", new Vector3(-0.92f, 0.78f, -4.11f), new Vector3(0.28f, 0.32f, 0.06f), taillightMat, false);
            AddBox(bus.transform, "Taillight_R", new Vector3(0.92f, 0.78f, -4.11f), new Vector3(0.28f, 0.32f, 0.06f), taillightMat, false);
            AddBox(bus.transform, "Mirror_L", new Vector3(-1.34f, 1.95f, 3.95f), new Vector3(0.12f, 0.34f, 0.18f), tireMat, false);
            AddBox(bus.transform, "Mirror_R", new Vector3(1.34f, 1.95f, 3.95f), new Vector3(0.12f, 0.34f, 0.18f), tireMat, false);

            // Ruedas con llantas de caucho y aros cromados
            float[] wheelZ = { -2.45f, 2.45f };
            float[] wheelX = { -1.14f, 1.14f };
            foreach (float wz in wheelZ)
            {
                foreach (float wx in wheelX)
                {
                    GameObject tire = AddCylinder(bus.transform, "Bus_Tire", new Vector3(wx, 0.44f, wz), new Vector3(0.88f, 0.16f, 0.88f), tireMat, false);
                    tire.transform.localEulerAngles = new Vector3(0f, 0f, 90f);
                    GameObject rim = AddCylinder(bus.transform, "Bus_Rim", new Vector3(wx + Mathf.Sign(wx) * 0.02f, 0.44f, wz), new Vector3(0.52f, 0.17f, 0.52f), rimMat, false);
                    rim.transform.localEulerAngles = new Vector3(0f, 0f, 90f);
                }
            }

            // Unidad de Aire Acondicionado de Techo + Domo Transceptor GPS/LTE conectado al Data Center
            AddBox(bus.transform, "Roof_AC_Unit", new Vector3(0f, 2.96f, -0.4f), new Vector3(1.45f, 0.22f, 2.4f), busWhiteMat, false);
            AddCylinder(bus.transform, "GPS_Radome_Base", new Vector3(0f, 2.94f, 2.6f), new Vector3(0.36f, 0.06f, 0.36f), busWhiteMat, false);
            GameObject gpsLed = AddSphere(bus.transform, "GPS_Active_Beacon", new Vector3(0f, 3.06f, 2.6f), new Vector3(0.18f, 0.18f, 0.18f), gpsBeaconMat);
            ctrl.blinkingLedRenderers.Add(gpsLed.GetComponent<Renderer>());

            TagInteractable(bus, "unab_bus_01");
            AddLabel(ctrl, "Bus Institucional UNAB #03 (Modulo GPS Activo)", new Vector3(pos.x, 4.15f, pos.z));
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

            // 1. RACK PRINCIPAL 42U DETALLADO (MIRANDO AL CENTRO DE LA SALA +X, CON PEINE DE CABLES CAT6A, BOTAS RJ45, SERVIDORES Y ROUTER)
            GameObject rack = new GameObject("Rack_Main_42U");
            rack.transform.SetParent(dc.transform, false);
            rack.transform.localPosition = new Vector3(-6.75f, 0.16f, -0.45f);
            rack.transform.localEulerAngles = new Vector3(0f, 90f, 0f);

            AddBox(rack.transform, "Rack_Collider", new Vector3(0f, 1.15f, 0f), new Vector3(0.98f, 2.3f, 1.0f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));
            AddBox(rack.transform, "Base", new Vector3(0f, 0.08f, 0f), new Vector3(0.92f, 0.08f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "Roof", new Vector3(0f, 2.24f, 0f), new Vector3(0.92f, 0.07f, 0.96f), darkMetal, false);
            AddBox(rack.transform, "TopCableGrommet", new Vector3(-0.26f, 2.28f, -0.18f), new Vector3(0.24f, 0.04f, 0.18f), chassisGray, false);
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

            // Organizador Vertical de Cables Cat6A dentro del Rack (Peine vertical con mazo de cables subiendo al techo del rack)
            AddBox(rack.transform, "VerticalCableManager_L", new Vector3(-0.35f, 1.45f, 0.22f), new Vector3(0.06f, 1.55f, 0.08f), darkMetal, false);
            for (int c = 0; c < 5; c++)
            {
                float cx = -0.365f + (c % 3) * 0.015f;
                float cz = -0.18f + (c / 3) * 0.018f;
                AddCylinder(rack.transform, "InternalTrunkCat6", new Vector3(cx, 1.82f, cz), new Vector3(0.016f, 0.52f, 0.016f), utpBlueMat);
            }

            // Puerta frontal perforada abierta a 75 grados
            GameObject rackDoor = new GameObject("OpenFrontDoor");
            rackDoor.transform.SetParent(rack.transform, false);
            rackDoor.transform.localPosition = new Vector3(-0.45f, 1.16f, 0.47f);
            rackDoor.transform.localEulerAngles = new Vector3(0f, 75f, 0f);
            AddBox(rackDoor.transform, "DoorFrame", new Vector3(0.44f, 0f, 0f), new Vector3(0.88f, 2.10f, 0.025f), CreatePbrMat("RackGlass", new Color(0.1f, 0.14f, 0.2f, 0.42f), 0.6f, 0.9f, null, null, true), false);

            // 2 Patch Panels Cat6A + 2 Switches Gigabit con Patch Cords cilindricos curvados y capuchones RJ45 amarillos
            float[] ppHeights = { 2.02f, 1.62f };
            float[] swHeights = { 1.82f, 1.42f };
            for (int b = 0; b < 2; b++)
            {
                float py = ppHeights[b];
                float sy = swHeights[b];
                AddBox(rack.transform, "PatchPanel_24P", new Vector3(0f, py, 0.34f), new Vector3(0.78f, 0.085f, 0.12f), darkMetal, false);
                AddBox(rack.transform, "Switch_24P", new Vector3(0f, sy, 0.12f), new Vector3(0.78f, 0.085f, 0.48f), chassisGray, false);
                AddBox(rack.transform, "HorizontalOrganizer", new Vector3(0f, (py + sy) * 0.5f, 0.38f), new Vector3(0.78f, 0.035f, 0.05f), darkMetal, false);

                for (int p = 0; p < 12; p++)
                {
                    float px = -0.32f + p * 0.058f;
                    // Capuchones protectores RJ45 amarillos en Patch Panel y Switch
                    AddBox(rack.transform, "BootPP", new Vector3(px, py - 0.01f, 0.406f), new Vector3(0.014f, 0.014f, 0.024f), yellowLabelMat, false);
                    AddBox(rack.transform, "BootSW", new Vector3(px, sy + 0.01f, 0.372f), new Vector3(0.014f, 0.014f, 0.024f), yellowLabelMat, false);
                    // Arco cilindrico del Patch Cord Cat6A
                    AddCylinder(rack.transform, "PatchCordArc", new Vector3(px, (py + sy) * 0.5f, 0.425f + (p % 2) * 0.008f), new Vector3(0.011f, Mathf.Abs(py - sy) * 0.52f, 0.011f), utpBlueMat);
                    AddBox(rack.transform, "PortLED", new Vector3(px, sy + 0.026f, 0.365f), new Vector3(0.012f, 0.012f, 0.01f), greenLedMat, false);
                }
                // Puertos Uplink SFP+ Fibra Optica a la derecha del Switch
                AddBox(rack.transform, "SFP_Cage1", new Vector3(0.35f, sy, 0.365f), new Vector3(0.028f, 0.024f, 0.018f), silverMat, false);
                AddBox(rack.transform, "SFP_Cage2", new Vector3(0.35f, sy - 0.025f, 0.365f), new Vector3(0.028f, 0.024f, 0.018f), blueLedMat, false);
            }

            // Extractores de aire superiores en el techo del Rack + Display Digital de Temperatura
            AddCylinder(rack.transform, "TopExhaustFan_1", new Vector3(-0.18f, 2.26f, 0.08f), new Vector3(0.24f, 0.02f, 0.24f), chassisGray);
            AddCylinder(rack.transform, "TopExhaustFan_2", new Vector3(0.18f, 2.26f, 0.08f), new Vector3(0.24f, 0.02f, 0.24f), chassisGray);
            AddBox(rack.transform, "RackTempDisplay", new Vector3(0f, 2.15f, 0.40f), new Vector3(0.78f, 0.045f, 0.04f), darkMetal, false);
            AddBox(rack.transform, "RackTempLCD", new Vector3(-0.22f, 2.15f, 0.422f), new Vector3(0.11f, 0.028f, 0.006f), lcdBlueMat, false);

            // Router Gateway Cisco ISR + MikroTik Cloud Core Router con pantalla LCD y 3 antenas
            AddBox(rack.transform, "Router_Shelf", new Vector3(0f, 1.14f, 0.05f), new Vector3(0.78f, 0.025f, 0.62f), darkMetal, false);
            AddBox(rack.transform, "Router_CCR_Chasis", new Vector3(-0.16f, 1.20f, 0.16f), new Vector3(0.42f, 0.075f, 0.28f), whiteMat, false);
            AddBox(rack.transform, "Router_LCD", new Vector3(-0.02f, 1.20f, 0.302f), new Vector3(0.08f, 0.04f, 0.006f), lcdBlueMat, false);
            AddBox(rack.transform, "Router_LEDs", new Vector3(-0.22f, 1.20f, 0.302f), new Vector3(0.18f, 0.012f, 0.008f), greenLedMat, false);
            AddCylinder(rack.transform, "Antenna_L", new Vector3(-0.32f, 1.33f, 0.06f), new Vector3(0.016f, 0.12f, 0.016f), whiteMat);
            AddCylinder(rack.transform, "Antenna_M", new Vector3(-0.16f, 1.33f, 0.06f), new Vector3(0.016f, 0.12f, 0.016f), whiteMat);
            AddCylinder(rack.transform, "Antenna_R", new Vector3(0.00f, 1.33f, 0.06f), new Vector3(0.016f, 0.12f, 0.016f), whiteMat);
            // Modem Fibra Optica ONT al lado derecho de la bandeja
            AddBox(rack.transform, "Fiber_ONT_Box", new Vector3(0.22f, 1.18f, 0.18f), new Vector3(0.22f, 0.045f, 0.18f), darkMetal, false);
            AddBox(rack.transform, "ONT_PON_LED", new Vector3(0.22f, 1.18f, 0.272f), new Vector3(0.08f, 0.01f, 0.006f), greenLedMat, false);

            // Servidor 1U Dell PowerEdge (Aplicaciones / API GPS) + Servidor 4U Storage (12 Bahias Hot-Swap SAS 3.5")
            AddBox(rack.transform, "Server_1U_App", new Vector3(0f, 0.92f, 0.02f), new Vector3(0.78f, 0.11f, 0.72f), chassisGray, false);
            AddBox(rack.transform, "Server_1U_Bezel", new Vector3(0f, 0.92f, 0.382f), new Vector3(0.76f, 0.09f, 0.015f), darkMetal, false);
            AddBox(rack.transform, "Server_1U_LCD", new Vector3(-0.24f, 0.92f, 0.392f), new Vector3(0.11f, 0.032f, 0.008f), blueLedMat, false);
            AddBox(rack.transform, "Server_1U_Handles", new Vector3(-0.37f, 0.92f, 0.40f), new Vector3(0.02f, 0.08f, 0.03f), silverMat, false);
            AddBox(rack.transform, "Server_1U_HandlesR", new Vector3(0.37f, 0.92f, 0.40f), new Vector3(0.02f, 0.08f, 0.03f), silverMat, false);

            AddBox(rack.transform, "Server_4U_DB", new Vector3(0f, 0.50f, 0.02f), new Vector3(0.78f, 0.36f, 0.74f), darkMetal, false);
            // Matriz realista de 12 Bahias Hot-Swap (3 filas x 4 columnas) con manijas plateadas y LEDs de estado/actividad
            for (int row = 0; row < 3; row++)
            {
                for (int col = 0; col < 4; col++)
                {
                    float bx = -0.255f + col * 0.17f;
                    float by = 0.38f + row * 0.11f;
                    AddBox(rack.transform, "DriveCaddy", new Vector3(bx, by, 0.395f), new Vector3(0.15f, 0.092f, 0.018f), chassisGray, false);
                    AddBox(rack.transform, "CaddyLatch", new Vector3(bx - 0.015f, by, 0.406f), new Vector3(0.09f, 0.032f, 0.008f), silverMat, false);
                    AddBox(rack.transform, "CaddyLED_Act", new Vector3(bx + 0.055f, by + 0.02f, 0.406f), new Vector3(0.012f, 0.012f, 0.006f), greenLedMat, false);
                    AddBox(rack.transform, "CaddyLED_St", new Vector3(bx + 0.055f, by - 0.015f, 0.406f), new Vector3(0.012f, 0.012f, 0.006f), blueLedMat, false);
                }
            }

            // Regleta PDU Horizontal con disyuntor iluminado y tomas IEC
            AddBox(rack.transform, "PDU_Power", new Vector3(0f, 0.20f, 0.30f), new Vector3(0.78f, 0.075f, 0.14f), darkMetal, false);
            AddBox(rack.transform, "PDU_Switch", new Vector3(-0.32f, 0.20f, 0.372f), new Vector3(0.035f, 0.035f, 0.012f), redLedMat, false);
            AddBox(rack.transform, "PDU_Meter", new Vector3(-0.22f, 0.20f, 0.372f), new Vector3(0.07f, 0.032f, 0.008f), lcdBlueMat, false);

            TagInteractable(rack, "rack_main");
            AddLabel(ctrl, "Rack Principal de Telecomunicaciones (42U)", new Vector3(-6.75f, 2.65f, -0.45f));

            // 2. SISTEMA UPS ONLINE 220V (3 TORRES INDUSTRIALES DOBLE CONVERSION CON PLATAFORMA, LCD Y BOTONERA)
            GameObject upsGroup = new GameObject("UPS_3000VA_Bank");
            upsGroup.transform.SetParent(dc.transform, false);
            upsGroup.transform.localPosition = new Vector3(-5.25f, 0.16f, -4.55f);
            upsGroup.transform.localEulerAngles = new Vector3(0f, 180f, 0f);

            AddBox(upsGroup.transform, "UPS_Collider", new Vector3(0f, 0.48f, 0f), new Vector3(1.38f, 0.98f, 0.78f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));
            // Plataforma aislante antivibracion en la base
            AddBox(upsGroup.transform, "AntiVib_Plinth", new Vector3(0f, 0.025f, 0f), new Vector3(1.32f, 0.05f, 0.74f), chassisGray, false);
            AddBox(upsGroup.transform, "SafetyYellowStripe", new Vector3(0f, 0.026f, 0.372f), new Vector3(1.32f, 0.02f, 0.01f), yellowLabelMat, false);

            (float x, float w, float h, float d)[] upsSpecs =
            {
                (-0.42f, 0.38f, 0.88f, 0.68f),
                ( 0.02f, 0.34f, 0.70f, 0.60f),
                ( 0.41f, 0.30f, 0.56f, 0.52f)
            };
            foreach (var u in upsSpecs)
            {
                AddBox(upsGroup.transform, "UPS_Tower", new Vector3(u.x, 0.05f + u.h * 0.5f, 0f), new Vector3(u.w, u.h, u.d), darkMetal, false);
                AddBox(upsGroup.transform, "FrontBezel", new Vector3(u.x, 0.05f + u.h * 0.5f, u.d * 0.5f + 0.012f), new Vector3(u.w * 0.92f, u.h * 0.95f, 0.024f), chassisGray, false);
                AddBox(upsGroup.transform, "LCD_Frame", new Vector3(u.x, 0.05f + u.h * 0.77f, u.d * 0.5f + 0.024f), new Vector3(u.w * 0.54f, 0.14f, 0.012f), darkMetal, false);
                AddBox(upsGroup.transform, "UPS_LCD_220V", new Vector3(u.x, 0.05f + u.h * 0.77f, u.d * 0.5f + 0.031f), new Vector3(u.w * 0.46f, 0.105f, 0.006f), lcdBlueMat, false);
                // Botonera de control debajo del LCD
                for (int b = -1; b <= 1; b++)
                {
                    AddCylinder(upsGroup.transform, "CtrlBtn", new Vector3(u.x + b * 0.035f, 0.05f + u.h * 0.64f, u.d * 0.5f + 0.026f),
                        new Vector3(0.018f, 0.006f, 0.018f), b == 0 ? greenLedMat : silverMat)
                        .transform.localEulerAngles = new Vector3(90f, 0f, 0f);
                }
                for (int s = 0; s < 6; s++)
                {
                    float sy = 0.14f + s * (u.h * 0.072f);
                    AddBox(upsGroup.transform, "VentSlat", new Vector3(u.x, sy, u.d * 0.5f + 0.026f), new Vector3(u.w * 0.76f, 0.016f, 0.012f), darkMetal, false);
                }
            }
            TagInteractable(upsGroup, "ups_power");
            AddLabel(ctrl, "Banco de UPS Online 220V (3000VA)", new Vector3(-5.25f, 1.35f, -4.55f));

            // 3. CLIMATIZADOR DE PRECISION EDAPOWER CRAC (DOBLE PUERTA, MALLA, PANTALLA HMI, BALIZA Y TUBERIAS DE COBRE)
            GameObject crac = new GameObject("EDApower_CRAC_Unit");
            crac.transform.SetParent(dc.transform, false);
            crac.transform.localPosition = new Vector3(-6.35f, 0.16f, 4.78f);

            AddBox(crac.transform, "Cabinet", new Vector3(0f, 1.12f, 0f), new Vector3(1.20f, 2.24f, 0.76f), darkMetal);
            AddBox(crac.transform, "DoorSeam", new Vector3(0f, 1.12f, -0.382f), new Vector3(0.012f, 2.18f, 0.01f), chassisGray, false);
            AddBox(crac.transform, "TopMeshLogo", new Vector3(0f, 1.82f, -0.385f), new Vector3(1.10f, 0.68f, 0.02f), cracMeshLogoMat, false);
            AddBox(crac.transform, "BottomMesh", new Vector3(0f, 0.52f, -0.385f), new Vector3(1.10f, 0.82f, 0.02f), cracMeshPlainMat, false);
            AddBox(crac.transform, "HMI_Bezel", new Vector3(0.18f, 1.24f, -0.39f), new Vector3(0.32f, 0.23f, 0.022f), silverMat, false);
            AddBox(crac.transform, "HMI_Touchscreen", new Vector3(0.18f, 1.24f, -0.402f), new Vector3(0.27f, 0.18f, 0.008f), lcdBlueMat, false);
            AddBox(crac.transform, "EmergencyStopBtn", new Vector3(-0.28f, 1.24f, -0.392f), new Vector3(0.055f, 0.055f, 0.02f), yellowLabelMat, false);
            AddCylinder(crac.transform, "EStopRedKnob", new Vector3(-0.28f, 1.24f, -0.408f), new Vector3(0.036f, 0.012f, 0.036f), redLedMat)
                .transform.localEulerAngles = new Vector3(90f, 0f, 0f);
            AddBox(crac.transform, "SwingHandle", new Vector3(0.46f, 0.95f, -0.395f), new Vector3(0.032f, 0.20f, 0.025f), silverMat, false);
            // Baliza superior de estado operativo + Tuberias de refrigeracion hacia el techo
            AddCylinder(crac.transform, "BeaconBase", new Vector3(-0.45f, 2.28f, 0f), new Vector3(0.06f, 0.04f, 0.06f), darkMetal);
            AddCylinder(crac.transform, "BeaconGreenLight", new Vector3(-0.45f, 2.35f, 0f), new Vector3(0.055f, 0.045f, 0.055f), greenLedMat);
            AddCylinder(crac.transform, "CoolantPipe_In", new Vector3(0.32f, 2.62f, 0.15f), new Vector3(0.055f, 0.38f, 0.055f), silverMat);
            AddCylinder(crac.transform, "CoolantPipe_Out", new Vector3(0.44f, 2.62f, 0.15f), new Vector3(0.055f, 0.38f, 0.055f), darkMetal);

            TagInteractable(crac, "ac_unit");
            AddLabel(ctrl, "Climatizador de Precision EDApower CRAC", new Vector3(-6.35f, 2.62f, 4.78f));

            // 4. EQUIPAMIENTO DE SEGURIDAD DEL DATA CENTER (EXTINTOR CO2 Y LECTOR BIOMETRICO DE ACCESO)
            Material fireRedMat = CreatePbrMat("FireRed", new Color(0.82f, 0.09f, 0.09f), 0.35f, 0.72f);
            GameObject ext = new GameObject("CO2_FireExtinguisher");
            ext.transform.SetParent(dc.transform, false);
            ext.transform.localPosition = new Vector3(-3.34f, 1.15f, 2.65f);
            AddBox(ext.transform, "SafetySign", new Vector3(0.01f, 0.42f, 0f), new Vector3(0.01f, 0.24f, 0.18f), fireRedMat, false);
            AddCylinder(ext.transform, "Tank", new Vector3(-0.08f, 0f, 0f), new Vector3(0.15f, 0.26f, 0.15f), fireRedMat);
            AddCylinder(ext.transform, "ValveNeck", new Vector3(-0.08f, 0.28f, 0f), new Vector3(0.05f, 0.04f, 0.05f), silverMat);
            AddCylinder(ext.transform, "CO2_Horn", new Vector3(-0.08f, 0.12f, 0.11f), new Vector3(0.06f, 0.12f, 0.06f), darkMetal)
                .transform.localEulerAngles = new Vector3(25f, 0f, 0f);

            // Lector Biometrico RFID junto a la puerta del Cuarto de Servidores (lado oficina)
            GameObject bio = new GameObject("Biometric_AccessControl");
            bio.transform.SetParent(dc.transform, false);
            bio.transform.localPosition = new Vector3(-3.07f, 1.38f, 3.22f);
            AddBox(bio.transform, "ReaderBody", Vector3.zero, new Vector3(0.03f, 0.18f, 0.11f), darkMetal, false);
            AddBox(bio.transform, "ReaderScreen", new Vector3(0.016f, 0.035f, 0f), new Vector3(0.005f, 0.065f, 0.075f), lcdBlueMat, false);
            AddBox(bio.transform, "FingerSensor", new Vector3(0.018f, -0.045f, 0f), new Vector3(0.01f, 0.035f, 0.03f), greenLedMat, false);
        }

        private static void BuildMonitoringOffice(Transform root, UNABSceneController ctrl)
        {
            GameObject office = new GameObject("Monitoring_Office_Furniture");
            office.transform.SetParent(root, false);

            Material woodMat = CreatePbrMat("DeskOakWood", Color.white, 0.06f, 0.68f, MakeWoodGrainTex(), new Vector2(2f, 1f));
            Material darkEdgeMat = CreatePbrMat("DeskEdge", new Color(0.16f, 0.14f, 0.12f), 0.1f, 0.5f);
            Material legMat = CreatePbrMat("DeskSteel", new Color(0.20f, 0.24f, 0.29f), 0.78f, 0.68f);
            Material chromeMat = CreatePbrMat("ChromeStar", new Color(0.75f, 0.78f, 0.82f), 0.9f, 0.85f);
            Material darkMat = CreatePbrMat("MatteBlack", new Color(0.08f, 0.09f, 0.11f), 0.45f, 0.62f);
            Material meshFabricMat = CreatePbrMat("ChairMesh", new Color(0.12f, 0.13f, 0.16f), 0.05f, 0.32f);
            Material padMat = CreatePbrMat("MousepadCloth", new Color(0.05f, 0.06f, 0.08f), 0.02f, 0.25f);
            Material glassCaseMat = CreatePbrMat("TemperedGlassCase", new Color(0.08f, 0.12f, 0.18f, 0.55f), 0.8f, 0.95f, null, null, true);
            Material rgbCyanMat = CreatePbrMat("CyanCoolerLED", new Color(0.05f, 0.82f, 0.98f), 0f, 0.9f, null, null, false, new Color(0.05f, 0.82f, 0.98f) * 2.5f);
            Material screenMat1 = CreatePbrMat("GpsScreen1", Color.white, 0.1f, 0.90f, MakeBusScreenTex(true), null, false, new Color(0.15f, 0.52f, 0.84f) * 0.95f);
            Material screenMat2 = CreatePbrMat("GpsScreen2", Color.white, 0.1f, 0.90f, MakeBusScreenTex(false), null, false, new Color(0.15f, 0.52f, 0.84f) * 0.95f);
            Material whiteShelfMat = CreatePbrMat("ShelfWhite", new Color(0.96f, 0.97f, 0.98f), 0.05f, 0.62f);
            Material plantPotMat = CreatePbrMat("CeramicPot", new Color(0.88f, 0.89f, 0.91f), 0.15f, 0.72f);
            Material soilMat = CreatePbrMat("DarkSoil", new Color(0.18f, 0.13f, 0.09f), 0f, 0.15f);
            Material leafGreenMat = CreatePbrMat("LeafGreen", new Color(0.14f, 0.46f, 0.17f), 0.05f, 0.48f);
            Material chartMat = CreatePbrMat("PrintedChart", Color.white, 0f, 0.55f, MakePrintedChartTex());

            void BuildDesk(float x, float zThree, float rotY, string key, string labelText, Material mainScrMat, Material auxScrMat)
            {
                float z = -zThree;
                GameObject d = new GameObject($"Workstation_{key}");
                d.transform.SetParent(office.transform, false);
                d.transform.localPosition = new Vector3(x, 0.12f, z);
                d.transform.localEulerAngles = new Vector3(0f, rotY, 0f);

                AddBox(d.transform, "Desk_Collider", new Vector3(0f, 0.68f, 0f), new Vector3(2.2f, 1.35f, 1.25f), CreatePbrMat("Inv", Color.clear, 0, 0, null, null, true));

                // Tablero de madera de roble con borde biselado oscuro, faldon metalico y pasacables
                AddBox(d.transform, "TableTop_Wood", new Vector3(0f, 0.745f, 0f), new Vector3(2.14f, 0.045f, 1.04f), woodMat, false);
                AddBox(d.transform, "TableTop_EdgeTrim", new Vector3(0f, 0.742f, 0f), new Vector3(2.16f, 0.038f, 1.06f), darkEdgeMat, false);
                AddBox(d.transform, "ModestyPanel_Front", new Vector3(0f, 0.52f, 0.42f), new Vector3(1.90f, 0.38f, 0.02f), legMat, false);
                AddCylinder(d.transform, "CableGrommet", new Vector3(0.65f, 0.77f, 0.34f), new Vector3(0.06f, 0.005f, 0.06f), darkMat);

                float[] legs = { -0.98f, -0.44f,  0.98f, -0.44f,  -0.98f, 0.44f,  0.98f, 0.44f };
                for (int i = 0; i < legs.Length; i += 2)
                {
                    AddBox(d.transform, "Leg", new Vector3(legs[i], 0.37f, legs[i + 1]), new Vector3(0.055f, 0.74f, 0.055f), legMat, false);
                    AddCylinder(d.transform, "LevelFoot", new Vector3(legs[i], 0.015f, legs[i + 1]), new Vector3(0.075f, 0.015f, 0.075f), chromeMat);
                }

                // Configuracion de Doble Monitor Profesional (Monitor Principal 27" + Monitor Secundario Inclinado 24" en brazo VESA doble)
                AddCylinder(d.transform, "VESA_MountPole", new Vector3(-0.18f, 0.94f, 0.34f), new Vector3(0.045f, 0.18f, 0.045f), legMat);
                AddBox(d.transform, "VESA_BaseClamp", new Vector3(-0.18f, 0.775f, 0.34f), new Vector3(0.14f, 0.02f, 0.14f), darkMat, false);
                AddBox(d.transform, "VESA_ArmMain", new Vector3(-0.04f, 1.08f, 0.27f), new Vector3(0.32f, 0.03f, 0.03f), legMat, false);
                AddBox(d.transform, "VESA_ArmAux", new Vector3(-0.42f, 1.08f, 0.24f), new Vector3(0.45f, 0.03f, 0.03f), legMat, false);

                // Monitor Principal 27" (Centrado)
                AddBox(d.transform, "MonitorMain_Frame", new Vector3(0.08f, 1.13f, 0.20f), new Vector3(0.76f, 0.45f, 0.025f), darkMat, false);
                AddBox(d.transform, "MonitorMain_Screen", new Vector3(0.08f, 1.13f, 0.185f), new Vector3(0.73f, 0.42f, 0.006f), mainScrMat, false);
                AddBox(d.transform, "MonitorMain_Chin", new Vector3(0.08f, 0.91f, 0.19f), new Vector3(0.76f, 0.018f, 0.03f), legMat, false);
                AddBox(d.transform, "MonitorMain_LED", new Vector3(0.42f, 0.91f, 0.174f), new Vector3(0.015f, 0.006f, 0.005f), rgbCyanMat, false);

                // Monitor Secundario 24" (Angulado a 22 grados hacia el operador)
                GameObject auxMon = new GameObject("MonitorAux_Angled");
                auxMon.transform.SetParent(d.transform, false);
                auxMon.transform.localPosition = new Vector3(-0.62f, 1.11f, 0.12f);
                auxMon.transform.localEulerAngles = new Vector3(0f, -24f, 0f);
                AddBox(auxMon.transform, "Frame", Vector3.zero, new Vector3(0.60f, 0.38f, 0.024f), darkMat, false);
                AddBox(auxMon.transform, "Screen", new Vector3(0f, 0f, -0.014f), new Vector3(0.57f, 0.35f, 0.006f), auxScrMat, false);

                // Mousepad XL + Teclado Mecanico con bloques de teclas + Mouse Ergonomico + Telefono IP Cisco + Taza UNAB
                AddBox(d.transform, "DeskMat_XL", new Vector3(0.08f, 0.770f, -0.14f), new Vector3(0.78f, 0.004f, 0.34f), padMat, false);
                AddBox(d.transform, "Keyboard_Chassis", new Vector3(0.0f, 0.780f, -0.14f), new Vector3(0.42f, 0.016f, 0.15f), darkMat, false);
                AddBox(d.transform, "Keycaps_Main", new Vector3(-0.04f, 0.790f, -0.14f), new Vector3(0.30f, 0.010f, 0.11f), legMat, false);
                AddBox(d.transform, "Keycaps_Numpad", new Vector3(0.155f, 0.790f, -0.14f), new Vector3(0.075f, 0.010f, 0.11f), legMat, false);
                AddBox(d.transform, "Keyboard_LightBar", new Vector3(0.0f, 0.782f, -0.216f), new Vector3(0.40f, 0.005f, 0.004f), rgbCyanMat, false);

                AddSphere(d.transform, "ErgonomicMouse", new Vector3(0.32f, 0.782f, -0.14f), new Vector3(0.065f, 0.032f, 0.105f), darkMat);
                AddBox(d.transform, "MouseScroll", new Vector3(0.32f, 0.796f, -0.11f), new Vector3(0.01f, 0.008f, 0.022f), chromeMat, false);

                // Telefono IP Empresarial en la esquina derecha del escritorio
                GameObject phone = new GameObject("Cisco_IP_Phone");
                phone.transform.SetParent(d.transform, false);
                phone.transform.localPosition = new Vector3(0.72f, 0.78f, -0.05f);
                phone.transform.localEulerAngles = new Vector3(-18f, 22f, 0f);
                AddBox(phone.transform, "PhoneBase", Vector3.zero, new Vector3(0.18f, 0.03f, 0.16f), darkMat, false);
                AddBox(phone.transform, "PhoneLCD", new Vector3(0.02f, 0.018f, 0.03f), new Vector3(0.09f, 0.005f, 0.055f), rgbCyanMat, false);
                AddBox(phone.transform, "Handset", new Vector3(-0.055f, 0.025f, 0f), new Vector3(0.042f, 0.025f, 0.17f), legMat, false);

                // Gabinete Workstation PC con ventana lateral de vidrio templado e interior iluminado (Cooler CPU + GPU)
                Vector3 pcPos = new Vector3(0.75f, 0.27f, 0.05f);
                AddBox(d.transform, "PC_Chassis", pcPos, new Vector3(0.23f, 0.52f, 0.48f), darkMat, false);
                AddBox(d.transform, "PC_GlassSide", pcPos + new Vector3(-0.116f, 0f, 0f), new Vector3(0.006f, 0.46f, 0.42f), glassCaseMat, false);
                AddCylinder(d.transform, "CPU_LiquidCooler_Ring", pcPos + new Vector3(-0.08f, 0.08f, 0.05f), new Vector3(0.11f, 0.015f, 0.11f), rgbCyanMat)
                    .transform.localEulerAngles = new Vector3(0f, 0f, 90f);
                AddBox(d.transform, "GPU_Card", pcPos + new Vector3(-0.06f, -0.06f, 0.02f), new Vector3(0.09f, 0.04f, 0.28f), legMat, false);
                AddBox(d.transform, "GPU_LED_Strip", pcPos + new Vector3(-0.106f, -0.06f, 0.02f), new Vector3(0.006f, 0.012f, 0.18f), rgbCyanMat, false);
                AddBox(d.transform, "PC_FrontPowerLED", pcPos + new Vector3(0f, 0.23f, -0.242f), new Vector3(0.08f, 0.012f, 0.006f), rgbCyanMat, false);

                // Silla Ejecutiva Ergonomica Completa (Base estrella 5 puntas con ruedas, piston, asiento, respaldo lumbar, reposabrazos y cabecera)
                Vector3 chPos = new Vector3(0f, 0f, -0.68f);
                AddCylinder(d.transform, "Chair_Piston", chPos + new Vector3(0f, 0.23f, 0f), new Vector3(0.05f, 0.20f, 0.05f), chromeMat);
                for (int arm = 0; arm < 5; arm++)
                {
                    float ang = arm * 72f * Mathf.Deg2Rad;
                    Vector3 dir = new Vector3(Mathf.Sin(ang), 0f, Mathf.Cos(ang));
                    GameObject legStar = AddBox(d.transform, "StarBaseLeg", chPos + dir * 0.16f + new Vector3(0f, 0.055f, 0f), new Vector3(0.035f, 0.025f, 0.32f), chromeMat, false);
                    legStar.transform.localEulerAngles = new Vector3(0f, arm * 72f, 0f);
                    AddSphere(d.transform, "CasterWheel", chPos + dir * 0.30f + new Vector3(0f, 0.025f, 0f), new Vector3(0.045f, 0.045f, 0.045f), darkMat);
                }
                AddBox(d.transform, "Chair_SeatCushion", chPos + new Vector3(0f, 0.45f, 0f), new Vector3(0.50f, 0.075f, 0.50f), meshFabricMat, false);
                AddBox(d.transform, "Chair_Backrest", chPos + new Vector3(0f, 0.80f, -0.22f), new Vector3(0.48f, 0.62f, 0.06f), meshFabricMat, false);
                AddBox(d.transform, "Chair_LumbarSupport", chPos + new Vector3(0f, 0.66f, -0.19f), new Vector3(0.42f, 0.14f, 0.03f), darkMat, false);
                AddBox(d.transform, "Chair_Headrest", chPos + new Vector3(0f, 1.18f, -0.21f), new Vector3(0.28f, 0.12f, 0.05f), darkMat, false);
                // Reposabrazos izquierdo y derecho en T
                AddBox(d.transform, "Armrest_StemL", chPos + new Vector3(-0.27f, 0.56f, -0.04f), new Vector3(0.03f, 0.22f, 0.04f), darkMat, false);
                AddBox(d.transform, "Armrest_PadL", chPos + new Vector3(-0.27f, 0.67f, -0.02f), new Vector3(0.07f, 0.025f, 0.26f), darkMat, false);
                AddBox(d.transform, "Armrest_StemR", chPos + new Vector3(0.27f, 0.56f, -0.04f), new Vector3(0.03f, 0.22f, 0.04f), darkMat, false);
                AddBox(d.transform, "Armrest_PadR", chPos + new Vector3(0.27f, 0.67f, -0.02f), new Vector3(0.07f, 0.025f, 0.26f), darkMat, false);

                TagInteractable(d, key);
                AddLabel(ctrl, labelText, new Vector3(x, 2.25f, z));
            }

            BuildDesk(0.85f, -3.85f, 0f, "pc_monitor_1", "PC Monitoreo #1 (Mapa GPS)", screenMat1, screenMat2);
            BuildDesk(5.4f, -3.85f, 0f, "pc_monitor_2", "PC Monitoreo #2 (Salidas/Llegadas)", screenMat2, screenMat1);
            BuildDesk(4.1f, 4.15f, 180f, "pc_admin", "PC Administracion de Red", screenMat1, screenMat2);

            // MUEBLE CREDENZA DE OFICINA + IMPRESORA MULTIFUNCIONAL EPSON ECOTANK PRO EN RED
            GameObject prn = new GameObject("Epson_EcoTank_Printer");
            prn.transform.SetParent(office.transform, false);
            prn.transform.localPosition = new Vector3(-1.75f, 0.12f, -0.65f);

            // Mueble Credenza moderno (Cuerpo blanco/antracita, tablero de madera de roble, puertas con tiradores cromados y paquetes de hojas A4)
            AddBox(prn.transform, "Credenza_Body", new Vector3(0f, 0.36f, 0f), new Vector3(0.96f, 0.72f, 0.72f), whiteShelfMat);
            AddBox(prn.transform, "Credenza_WoodTop", new Vector3(0f, 0.74f, 0f), new Vector3(1.00f, 0.04f, 0.76f), woodMat, false);
            AddBox(prn.transform, "Credenza_DoorL", new Vector3(-0.23f, 0.35f, -0.365f), new Vector3(0.44f, 0.62f, 0.015f), legMat, false);
            AddBox(prn.transform, "Credenza_DoorR", new Vector3(0.23f, 0.35f, -0.365f), new Vector3(0.44f, 0.62f, 0.015f), legMat, false);
            AddBox(prn.transform, "Handle_L", new Vector3(-0.05f, 0.42f, -0.38f), new Vector3(0.015f, 0.14f, 0.015f), chromeMat, false);
            AddBox(prn.transform, "Handle_R", new Vector3(0.05f, 0.42f, -0.38f), new Vector3(0.015f, 0.14f, 0.015f), chromeMat, false);

            // Impresora Multifuncional Epson EcoTank Pro con alimentador ADF superior, panel LCD inclinado y tanques CMYK translucidos
            AddBox(prn.transform, "Printer_MainChassis", new Vector3(-0.05f, 0.90f, 0f), new Vector3(0.58f, 0.28f, 0.48f), darkMat);
            AddBox(prn.transform, "Scanner_Bed", new Vector3(-0.05f, 1.05f, 0f), new Vector3(0.57f, 0.035f, 0.46f), legMat, false);
            AddBox(prn.transform, "ADF_FeederTop", new Vector3(-0.08f, 1.09f, 0.02f), new Vector3(0.42f, 0.045f, 0.32f), darkMat, false);
            GameObject ctrlPanel = AddBox(prn.transform, "FrontControlPanel", new Vector3(-0.06f, 0.94f, -0.245f), new Vector3(0.36f, 0.075f, 0.02f), legMat, false);
            ctrlPanel.transform.localEulerAngles = new Vector3(22f, 0f, 0f);
            AddBox(ctrlPanel.transform, "Printer_ColorLCD", new Vector3(0f, 0f, -0.012f), new Vector3(0.11f, 0.048f, 0.005f), rgbCyanMat, false);

            AddBox(prn.transform, "EcoTank_Bay", new Vector3(0.28f, 0.88f, -0.04f), new Vector3(0.15f, 0.24f, 0.34f), darkMat, false);
            Color[] cmyk = { new Color(0.1f, 0.1f, 0.12f), new Color(0.0f, 0.72f, 0.95f), new Color(0.92f, 0.12f, 0.55f), new Color(0.98f, 0.82f, 0.06f) };
            for (int t = 0; t < 4; t++)
            {
                AddBox(prn.transform, $"InkWindow_{t}", new Vector3(0.24f + t * 0.028f, 0.87f, -0.215f), new Vector3(0.020f, 0.15f, 0.01f),
                    CreatePbrMat($"Ink_{t}", cmyk[t], 0.1f, 0.88f), false);
            }
            AddBox(prn.transform, "OutputTray", new Vector3(-0.06f, 0.78f, -0.32f), new Vector3(0.34f, 0.012f, 0.24f), darkMat, false);
            AddBox(prn.transform, "Printed_Sheet", new Vector3(-0.06f, 0.79f, -0.33f), new Vector3(0.28f, 0.006f, 0.22f), chartMat, false);

            TagInteractable(prn, "printer_net");
            AddLabel(ctrl, "Impresora Epson EcoTank en Red", new Vector3(-1.75f, 1.55f, -0.65f));

            // PANTALLA SMART TV 65" EN PARED (VIDEO WALL DE MONITOREO DE FLOTA UNAB)
            GameObject wallTv = new GameObject("SmartTV_65_VideoWall");
            wallTv.transform.SetParent(office.transform, false);
            wallTv.transform.localPosition = new Vector3(-1.15f, 2.05f, 5.34f);
            AddBox(wallTv.transform, "TV_Bezel", Vector3.zero, new Vector3(1.56f, 0.92f, 0.04f), darkMat, false);
            AddBox(wallTv.transform, "TV_Screen", new Vector3(0f, 0f, -0.022f), new Vector3(1.50f, 0.86f, 0.008f), screenMat1, false);
            AddBox(wallTv.transform, "TV_WallMount", new Vector3(0f, 0f, 0.025f), new Vector3(0.65f, 0.35f, 0.03f), legMat, false);

            // Estante Ejecutivo de 5 Niveles con respaldo de madera, archivadores, libros y jarrones
            GameObject shelf = new GameObject("White_5Tier_Bookcase");
            shelf.transform.SetParent(office.transform, false);
            shelf.transform.localPosition = new Vector3(-2.72f, 0.12f, -3.55f);
            shelf.transform.localEulerAngles = new Vector3(0f, 90f, 0f);

            AddBox(shelf.transform, "LeftSide", new Vector3(-0.44f, 1.05f, 0f), new Vector3(0.035f, 2.10f, 0.36f), whiteShelfMat);
            AddBox(shelf.transform, "RightSide", new Vector3(0.44f, 1.05f, 0f), new Vector3(0.035f, 2.10f, 0.36f), whiteShelfMat);
            AddBox(shelf.transform, "BackPanel_Oak", new Vector3(0f, 1.05f, -0.17f), new Vector3(0.90f, 2.10f, 0.02f), woodMat);

            Color[] bookCols = { new Color(0.12f, 0.28f, 0.54f), new Color(0.72f, 0.20f, 0.14f), new Color(0.18f, 0.22f, 0.28f), new Color(0.82f, 0.60f, 0.18f), new Color(0.14f, 0.52f, 0.42f) };
            for (int s = 0; s <= 5; s++)
            {
                float sy = 0.04f + s * 0.40f;
                AddBox(shelf.transform, $"Board_{s}", new Vector3(0f, sy, 0f), new Vector3(0.88f, 0.03f, 0.35f), whiteShelfMat, false);
                if (s < 5)
                {
                    for (int b = 0; b < 6; b++)
                    {
                        Material bm = CreatePbrMat("Book", bookCols[(s + b) % bookCols.Length], 0.08f, 0.48f);
                        GameObject bk = AddBox(shelf.transform, "Binder", new Vector3(-0.34f + b * 0.095f, sy + 0.15f, 0.02f), new Vector3(0.062f, 0.26f, 0.24f), bm, false);
                        AddBox(bk.transform, "SpineLabel", new Vector3(0f, 0.22f, 0.51f), new Vector3(0.75f, 0.18f, 0.02f), whiteShelfMat, false);
                    }
                    AddCylinder(shelf.transform, "CeramicVase", new Vector3(0.31f, sy + 0.11f, 0.02f), new Vector3(0.09f, 0.09f, 0.09f), chromeMat);
                }
            }

            // Macetas Ceramicas Cilindricas con tierra oscura, piedritas decorativas, 3 troncos y rosetas de hojas Dracaena
            Material stemMat = CreatePbrMat("WoodyStem", new Color(0.42f, 0.28f, 0.16f), 0f, 0.3f);
            void BuildPlanter(float px, float pzThree)
            {
                GameObject pl = new GameObject("Indoor_Planter");
                pl.transform.SetParent(office.transform, false);
                pl.transform.localPosition = new Vector3(px, 0.12f, -pzThree);
                AddCylinder(pl.transform, "CeramicPot_Body", new Vector3(0f, 0.36f, 0f), new Vector3(0.42f, 0.36f, 0.42f), plantPotMat, true);
                AddCylinder(pl.transform, "Pot_Rim", new Vector3(0f, 0.71f, 0f), new Vector3(0.45f, 0.025f, 0.45f), plantPotMat, false);
                AddCylinder(pl.transform, "PottingSoil", new Vector3(0f, 0.72f, 0f), new Vector3(0.39f, 0.015f, 0.39f), soilMat, false);

                AddCylinder(pl.transform, "Stem_Tall", new Vector3(-0.04f, 0.98f, 0f), new Vector3(0.042f, 0.28f, 0.042f), stemMat);
                AddCylinder(pl.transform, "Stem_Mid", new Vector3(0.05f, 0.90f, 0.03f), new Vector3(0.036f, 0.20f, 0.036f), stemMat);
                AddCylinder(pl.transform, "Stem_Low", new Vector3(0.01f, 0.82f, -0.05f), new Vector3(0.032f, 0.14f, 0.032f), stemMat);

                for (int l = 0; l < 16; l++)
                {
                    float ang = l * 22.5f;
                    float hOff = 1.05f + (l % 3) * 0.11f;
                    GameObject leaf = AddBox(pl.transform, "DracaenaLeaf", new Vector3(0f, hOff, 0f), new Vector3(0.075f, 0.016f, 0.56f), leafGreenMat, false);
                    leaf.transform.localEulerAngles = new Vector3(22f + (l % 3) * 11f, ang, 0f);
                }
            }
            BuildPlanter(-2.6f, -1.15f);
            BuildPlanter(6.65f, 4.35f);
        }

        private static void BuildStructuredCabling(Transform root, UNABSceneController ctrl)
        {
            GameObject cab = new GameObject("Structured_Cabling_Cat6A");
            cab.transform.SetParent(root, false);

            Material trayMat = CreatePbrMat("LadderTrayGalvanized", new Color(0.54f, 0.58f, 0.64f), 0.82f, 0.68f);
            Material velcroMat = CreatePbrMat("VelcroBlack", new Color(0.08f, 0.08f, 0.10f), 0.1f, 0.3f);
            Material pvcMat = CreatePbrMat("WallTrunkingPVC", new Color(0.92f, 0.94f, 0.96f), 0.08f, 0.60f);
            Material faceplateMat = CreatePbrMat("FaceplateWhite", new Color(0.97f, 0.98f, 0.99f), 0.05f, 0.65f);
            Material cat6BlueMat = CreatePbrMat("Cat6A_PanduitBlue", new Color(0.04f, 0.46f, 0.82f), 0.12f, 0.62f);
            Material cat6CyanMat = CreatePbrMat("Cat6A_LightBlue", new Color(0.10f, 0.58f, 0.90f), 0.12f, 0.62f);
            Material fiberYellowMat = CreatePbrMat("FiberOS2_Yellow", new Color(0.96f, 0.78f, 0.08f), 0.15f, 0.68f);
            Material rj45PlugMat = CreatePbrMat("RJ45_Polycarbonate", new Color(0.85f, 0.92f, 0.98f, 0.85f), 0.2f, 0.9f, null, null, true);
            Material packetMat = CreatePbrMat("DataPacket", new Color(0.22f, 0.78f, 0.99f), 0f, 0.95f, null, null, false, new Color(0.22f, 0.78f, 0.99f) * 2.6f);

            // Helper para crear un cilindro entre dos puntos 3D exactos (para cables redondos Cat6A y patch cords curvados)
            void AddCylBetween(Transform parent, string name, Vector3 a, Vector3 b, float diameter, Material mat)
            {
                float dist = Vector3.Distance(a, b);
                if (dist < 0.001f) return;
                Vector3 mid = (a + b) * 0.5f;
                GameObject cyl = AddCylinder(parent, name, mid, new Vector3(diameter, dist * 0.5f, diameter), mat, false);
                cyl.transform.up = (b - a).normalized;
            }

            // Helper para construir Bandeja Portacables Tipo Escalera Galvanizada + Mazo peinado de 5 cables cilindricos Cat6A + Cintillos Velcro
            void BuildLadderTray(string name, Vector3 start, Vector3 end, int numCables)
            {
                GameObject tg = new GameObject(name);
                tg.transform.SetParent(cab.transform, false);

                Vector3 dir = (end - start).normalized;
                float len = Vector3.Distance(start, end);
                Vector3 mid = (start + end) * 0.5f;
                Vector3 right = Vector3.Cross(Vector3.up, dir).normalized;
                float trayW = 0.26f;

                // Perfiles laterales C de acero galvanizado
                AddCylBetween(tg.transform, "SideRail_L", start - right * (trayW * 0.5f), end - right * (trayW * 0.5f), 0.024f, trayMat);
                AddCylBetween(tg.transform, "SideRail_R", start + right * (trayW * 0.5f), end + right * (trayW * 0.5f), 0.024f, trayMat);

                // Peldanos transversales cada 28cm + Soportes roscados al techo cada 1.4m
                int rungs = Mathf.Max(2, Mathf.FloorToInt(len / 0.28f));
                for (int i = 0; i <= rungs; i++)
                {
                    Vector3 p = Vector3.Lerp(start, end, (float)i / rungs);
                    AddCylBetween(tg.transform, "Rung", p - right * (trayW * 0.5f), p + right * (trayW * 0.5f), 0.014f, trayMat);

                    if (i % 5 == 0)
                    {
                        AddCylBetween(tg.transform, "HangerL", p - right * (trayW * 0.5f), p - right * (trayW * 0.5f) + Vector3.up * 0.22f, 0.010f, trayMat);
                        AddCylBetween(tg.transform, "HangerR", p + right * (trayW * 0.5f), p + right * (trayW * 0.5f) + Vector3.up * 0.22f, 0.010f, trayMat);
                    }
                }

                // Mazo peinado de cables cilindricos Cat6A sobre los peldanos
                for (int c = 0; c < numCables; c++)
                {
                    float offset = (c - (numCables - 1) * 0.5f) * 0.024f;
                    Vector3 cStart = start + right * offset + Vector3.up * 0.016f;
                    Vector3 cEnd = end + right * offset + Vector3.up * 0.016f;
                    Material cMat = (c == numCables - 1 && numCables >= 5) ? fiberYellowMat : (c % 2 == 0 ? cat6BlueMat : cat6CyanMat);
                    AddCylBetween(tg.transform, $"Cat6A_Strand_{c}", cStart, cEnd, 0.018f, cMat);
                }

                // Cintillos Velcro negros organizadores cada 55cm
                int ties = Mathf.Max(2, Mathf.FloorToInt(len / 0.55f));
                for (int t = 1; t < ties; t++)
                {
                    Vector3 tp = Vector3.Lerp(start, end, (float)t / ties) + Vector3.up * 0.016f;
                    GameObject tie = AddBox(tg.transform, "VelcroTie", tp, new Vector3(numCables * 0.026f + 0.02f, 0.026f, 0.018f), velcroMat, false);
                    tie.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);
                }
            }

            // Helper para construir Roseta Doble RJ45 Cat6A de Pared (Faceplate)
            void BuildWallFaceplateRJ45(Vector3 pos, Vector3 normal, string labelName)
            {
                GameObject fp = new GameObject($"Faceplate_RJ45_{labelName}");
                fp.transform.SetParent(cab.transform, false);
                fp.transform.localPosition = pos;
                fp.transform.rotation = Quaternion.LookRotation(normal, Vector3.up);

                AddBox(fp.transform, "BoxBase", new Vector3(0f, 0f, 0.012f), new Vector3(0.086f, 0.086f, 0.024f), faceplateMat, false);
                AddBox(fp.transform, "LabelSlot", new Vector3(0f, 0.026f, 0.025f), new Vector3(0.052f, 0.012f, 0.004f), cat6CyanMat, false);
                // 2 Jacks modulares RJ45 Cat6A (Azul Datos / Amarillo Voz-Respaldo)
                AddBox(fp.transform, "Keystone_Data1", new Vector3(-0.016f, -0.005f, 0.025f), new Vector3(0.018f, 0.022f, 0.006f), cat6BlueMat, false);
                AddBox(fp.transform, "Keystone_Data2", new Vector3(0.016f, -0.005f, 0.025f), new Vector3(0.018f, 0.022f, 0.006f), fiberYellowMat, false);
            }

            // Helper para construir un Patch Cord Cat6A flexible curvado con conectores RJ45 y capuchones protectores
            void BuildCurvedPatchCord(string name, Vector3 startPlug, Vector3 endPlug, float sag, out Vector3 midPoint)
            {
                GameObject pc = new GameObject(name);
                pc.transform.SetParent(cab.transform, false);

                // Capuchones RJ45 amarillos + conector policarbonato en ambos extremos
                Vector3 dirStart = (endPlug - startPlug).normalized;
                AddCylBetween(pc.transform, "Boot_Start", startPlug, startPlug + dirStart * 0.032f, 0.018f, fiberYellowMat);
                AddCylBetween(pc.transform, "Plug_Start", startPlug - dirStart * 0.012f, startPlug, 0.014f, rj45PlugMat);

                AddCylBetween(pc.transform, "Boot_End", endPlug - dirStart * 0.032f, endPlug, 0.018f, fiberYellowMat);
                AddCylBetween(pc.transform, "Plug_End", endPlug, endPlug + dirStart * 0.012f, 0.014f, rj45PlugMat);

                int segs = 10;
                Vector3 prev = startPlug;
                midPoint = (startPlug + endPlug) * 0.5f + Vector3.down * sag;
                for (int s = 1; s <= segs; s++)
                {
                    float t = (float)s / segs;
                    Vector3 cur = Vector3.Lerp(startPlug, endPlug, t);
                    cur.y -= Mathf.Sin(t * Mathf.PI) * sag;
                    AddCylBetween(pc.transform, $"CordSeg_{s}", prev, cur, 0.013f, cat6BlueMat);
                    prev = cur;
                }
            }

            float trayY = 2.94f; // Suspendida bajo el falso techo para verse nitida tanto adentro como desde arriba

            // 1. BAJANTE VERTICAL DEL RACK 42U A LA BANDEJA AEREA (Saliendo del pasacables superior del Rack, sin barras flotantes)
            Vector3 rackTopGrommet = new Vector3(-6.92f, 2.38f, -0.19f);
            Vector3 rackOverhead = new Vector3(-6.92f, trayY, -0.19f);
            Vector3 westTrayJoin = new Vector3(-7.62f, trayY, -0.19f);

            for (int c = 0; c < 6; c++)
            {
                float ox = (c % 3 - 1) * 0.022f;
                float oz = (c / 3 - 0.5f) * 0.022f;
                AddCylBetween(cab.transform, $"RackRiserCat6_{c}",
                    rackTopGrommet + new Vector3(ox, 0f, oz),
                    rackOverhead + new Vector3(ox, 0.02f, oz),
                    0.018f, c == 5 ? fiberYellowMat : cat6BlueMat);
            }
            for (int ty = 0; ty < 3; ty++)
            {
                AddBox(cab.transform, "RiserVelcro", new Vector3(-6.92f, 2.50f + ty * 0.18f, -0.19f), new Vector3(0.08f, 0.02f, 0.06f), velcroMat, false);
            }

            // 2. BANDEJAS PORTACABLES TIPO ESCALERA 100% ORTOGONALES (Cero diagonales en el techo)
            BuildLadderTray("LadderTray_RackBridge", rackOverhead, westTrayJoin, 6);
            BuildLadderTray("LadderTray_West_DC", new Vector3(-7.62f, trayY, -0.55f), new Vector3(-7.62f, trayY, 5.12f), 6);
            BuildLadderTray("LadderTray_North_Main", new Vector3(-7.62f, trayY, 5.12f), new Vector3(6.55f, trayY, 5.12f), 5);
            BuildLadderTray("LadderTray_Office_Partition", new Vector3(-2.96f, trayY, 5.12f), new Vector3(-2.96f, trayY, -5.12f), 4);
            BuildLadderTray("LadderTray_South_Admin", new Vector3(-2.96f, trayY, -5.12f), new Vector3(3.50f, trayY, -5.12f), 3);

            // Pasamuros cortafuego en el muro divisorio (x = -3.20)
            AddBox(cab.transform, "Firestop_Sleeve_North", new Vector3(-3.20f, trayY + 0.01f, 5.12f), new Vector3(0.32f, 0.09f, 0.32f), velcroMat, false);

            // 3. CANALETAS PVC EN MUROS SOLIDOS + ROSETAS RJ45 + PATCH CORDS CAT6A CURVADOS A CADA EQUIPO

            // --- PUNTO DE RED 1: PC MONITOREO #1 (Muro Norte solido en x = 1.60, z = 5.36) ---
            AddBox(cab.transform, "PVC_Raceway_PC1", new Vector3(1.60f, 1.68f, 5.36f), new Vector3(0.055f, 2.52f, 0.032f), pvcMat, false);
            BuildWallFaceplateRJ45(new Vector3(1.60f, 0.42f, 5.35f), Vector3.back, "PT01_PC1");
            Vector3 pc1WallPlug = new Vector3(1.60f, 0.41f, 5.31f);
            Vector3 pc1TowerPlug = new Vector3(1.60f, 0.38f, 4.14f);
            BuildCurvedPatchCord("PatchCord_Cat6A_PC1", pc1WallPlug, pc1TowerPlug, 0.14f, out Vector3 pc1Mid);

            // --- PUNTO DE RED 2: PC MONITOREO #2 (Baja por columna solida x = 6.52 para NO cruzar la ventana, y corre por zocalo a x = 6.15) ---
            AddBox(cab.transform, "PVC_Raceway_PC2_Vert", new Vector3(6.52f, 1.63f, 5.36f), new Vector3(0.055f, 2.62f, 0.032f), pvcMat, false);
            AddBox(cab.transform, "PVC_Raceway_PC2_Horiz", new Vector3(6.33f, 0.32f, 5.36f), new Vector3(0.42f, 0.045f, 0.032f), pvcMat, false);
            BuildWallFaceplateRJ45(new Vector3(6.15f, 0.32f, 5.35f), Vector3.back, "PT02_PC2");
            Vector3 pc2WallPlug = new Vector3(6.15f, 0.31f, 5.31f);
            Vector3 pc2TowerPlug = new Vector3(6.15f, 0.38f, 4.14f);
            BuildCurvedPatchCord("PatchCord_Cat6A_PC2", pc2WallPlug, pc2TowerPlug, 0.12f, out Vector3 pc2Mid);

            // --- PUNTO DE RED 3: IMPRESORA EPSON ECOTANK (Baja por muro solido x = -3.06, z = 1.82 fuera del vidrio, y va por zocalo bajo la ventana hasta z = -0.65) ---
            AddBox(cab.transform, "PVC_Raceway_Prn_Vert", new Vector3(-3.06f, 1.62f, 1.82f), new Vector3(0.032f, 2.64f, 0.055f), pvcMat, false);
            AddBox(cab.transform, "PVC_Raceway_Prn_Baseboard", new Vector3(-3.06f, 0.30f, 0.58f), new Vector3(0.032f, 0.045f, 2.52f), pvcMat, false);
            BuildWallFaceplateRJ45(new Vector3(-3.05f, 0.32f, -0.65f), Vector3.right, "PT03_PRINTER");
            Vector3 prnWallPlug = new Vector3(-3.01f, 0.32f, -0.65f);
            Vector3 prnPortPlug = new Vector3(-2.04f, 0.86f, -0.65f);
            BuildCurvedPatchCord("PatchCord_Cat6A_Printer", prnWallPlug, prnPortPlug, 0.12f, out Vector3 prnMid);

            // --- PUNTO DE RED 4: PC ADMINISTRACION DE RED (Muro Sur solido en x = 3.35, z = -5.36) ---
            AddBox(cab.transform, "PVC_Raceway_Admin_Vert", new Vector3(3.35f, 1.68f, -5.36f), new Vector3(0.055f, 2.52f, 0.032f), pvcMat, false);
            BuildWallFaceplateRJ45(new Vector3(3.35f, 0.42f, -5.35f), Vector3.forward, "PT04_ADMIN");
            Vector3 admWallPlug = new Vector3(3.35f, 0.41f, -5.31f);
            Vector3 admTowerPlug = new Vector3(3.35f, 0.38f, -4.40f);
            BuildCurvedPatchCord("PatchCord_Cat6A_Admin", admWallPlug, admTowerPlug, 0.13f, out Vector3 admMid);

            // 4. RUTAS ORTOGONALES DE PAQUETES DE DATOS EN TIEMPO REAL (Siguiendo exactamente las bandejas y canaletas)
            Vector3[][] routes =
            {
                // Ruta 1 -> PC Monitoreo #1
                new[] {
                    rackTopGrommet, rackOverhead, westTrayJoin,
                    new Vector3(-7.62f, trayY + 0.02f, 5.12f),
                    new Vector3(1.60f, trayY + 0.02f, 5.12f),
                    new Vector3(1.60f, trayY + 0.02f, 5.34f),
                    pc1WallPlug, pc1Mid, pc1TowerPlug
                },
                // Ruta 2 -> PC Monitoreo #2
                new[] {
                    rackTopGrommet, rackOverhead, westTrayJoin,
                    new Vector3(-7.62f, trayY + 0.02f, 5.12f),
                    new Vector3(6.52f, trayY + 0.02f, 5.12f),
                    new Vector3(6.52f, 0.32f, 5.34f),
                    pc2WallPlug, pc2Mid, pc2TowerPlug
                },
                // Ruta 3 -> Impresora Epson EcoTank en Red
                new[] {
                    rackTopGrommet, rackOverhead, westTrayJoin,
                    new Vector3(-7.62f, trayY + 0.02f, 5.12f),
                    new Vector3(-2.96f, trayY + 0.02f, 5.12f),
                    new Vector3(-2.96f, trayY + 0.02f, 1.82f),
                    new Vector3(-3.04f, 0.30f, 1.82f),
                    prnWallPlug, prnMid, prnPortPlug
                },
                // Ruta 4 -> PC Administracion de Red
                new[] {
                    rackTopGrommet, rackOverhead, westTrayJoin,
                    new Vector3(-7.62f, trayY + 0.02f, 5.12f),
                    new Vector3(-2.96f, trayY + 0.02f, 5.12f),
                    new Vector3(-2.96f, trayY + 0.02f, -5.12f),
                    new Vector3(3.35f, trayY + 0.02f, -5.12f),
                    new Vector3(3.35f, 0.42f, -5.34f),
                    admWallPlug, admMid, admTowerPlug
                }
            };

            for (int r = 0; r < routes.Length; r++)
            {
                var pts = routes[r];
                GameObject pkt = AddSphere(cab.transform, $"DataPacket_{r}", pts[0], Vector3.one * 0.095f, packetMat);
                ctrl.packetRoutes.Add(new DataPacketRoute
                {
                    packetMesh = pkt.transform,
                    waypoints = pts,
                    progress = (r * 0.24f) % 1f,
                    speed = 0.17f + (r % 2) * 0.03f
                });
            }

            TagInteractable(cab, "structured_cabling");
            AddLabel(ctrl, "Bandejas Tipo Escalera + Cableado Cat6A", new Vector3(-6.92f, 3.05f, -0.19f));
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

        private static Texture2D MakeWoodGrainTex()
        {
            int sz = 256;
            var t = new Texture2D(sz, sz, TextureFormat.RGBA32, true) { anisoLevel = 8, wrapMode = TextureWrapMode.Repeat };
            Color c1 = new Color(0.66f, 0.45f, 0.25f);
            Color c2 = new Color(0.55f, 0.36f, 0.19f);
            Color c3 = new Color(0.46f, 0.29f, 0.14f);
            for (int y = 0; y < sz; y++)
            {
                for (int x = 0; x < sz; x++)
                {
                    float wave = Mathf.Sin((y * 0.18f) + Mathf.Sin(x * 0.045f) * 3.5f) * 0.5f + 0.5f;
                    float fine = Mathf.Sin(y * 0.85f + x * 0.02f) * 0.5f + 0.5f;
                    Color c = Color.Lerp(c1, c2, wave);
                    c = Color.Lerp(c, c3, fine * 0.28f);
                    t.SetPixel(x, y, c);
                }
            }
            t.Apply();
            return t;
        }

        private static Texture2D MakeBusScreenTex(bool mapVariant)
        {
            int w = 512, h = 320;
            var t = new Texture2D(w, h, TextureFormat.RGBA32, true) { anisoLevel = 8 };
            Color bg = new Color(0.05f, 0.09f, 0.16f);
            Color sidebar = new Color(0.03f, 0.06f, 0.11f);
            Color header = new Color(0.02f, 0.38f, 0.68f);
            Color card = new Color(0.08f, 0.14f, 0.24f);
            Color park = new Color(0.07f, 0.26f, 0.16f);
            Color grid = new Color(0.09f, 0.18f, 0.30f);
            Color route1 = new Color(0.05f, 0.82f, 0.98f);
            Color route2 = new Color(0.15f, 0.92f, 0.48f);
            Color warn = new Color(0.98f, 0.72f, 0.12f);

            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    if (y > h - 34)
                    {
                        t.SetPixel(x, y, header);
                    }
                    else if (x < 118)
                    {
                        bool isCard = (x > 10 && x < 108) && ((y > 220 && y < 270) || (y > 155 && y < 205) || (y > 90 && y < 140) || (y > 25 && y < 75));
                        bool isBar = isCard && (x > 18 && x < 92) && ((y % 65) > 12 && (y % 65) < 20);
                        t.SetPixel(x, y, isBar ? (mapVariant ? route1 : route2) : (isCard ? card : sidebar));
                    }
                    else if (mapVariant)
                    {
                        bool isPark = (x > 145 && x < 265 && y > 165 && y < 255) || (x > 330 && x < 465 && y > 40 && y < 125);
                        float dRoute1 = Mathf.Abs((y - 70f) - Mathf.Sin((x - 120f) * 0.018f) * 55f - (x - 120f) * 0.35f);
                        float dRoute2 = Mathf.Abs((y - 240f) + (x - 120f) * 0.42f);
                        bool isBusNode = (Vector2.Distance(new Vector2(x, y), new Vector2(240, 145)) < 8f) ||
                                         (Vector2.Distance(new Vector2(x, y), new Vector2(375, 195)) < 8f) ||
                                         (Vector2.Distance(new Vector2(x, y), new Vector2(310, 95)) < 7f);
                        if (isBusNode) t.SetPixel(x, y, warn);
                        else if (dRoute1 < 3.2f) t.SetPixel(x, y, route1);
                        else if (dRoute2 < 2.8f) t.SetPixel(x, y, route2);
                        else if (isPark) t.SetPixel(x, y, park);
                        else if ((x % 32 == 0) || (y % 32 == 0)) t.SetPixel(x, y, grid);
                        else t.SetPixel(x, y, bg);
                    }
                    else
                    {
                        // Panel de telemetria y graficos de barras/lineas para el monitor secundario
                        bool isPanel = (x > 135 && x < 492) && ((y > 165 && y < 270) || (y > 25 && y < 145));
                        bool isChartBar = (x > 155 && x < 470 && y > 40 && y < 125) && (((x - 155) % 28) < 16) && (y < 55 + ((x * 37) % 65));
                        float waveY = 210f + Mathf.Sin(x * 0.05f) * 28f + Mathf.Cos(x * 0.11f) * 12f;
                        if (Mathf.Abs(y - waveY) < 2.5f && x > 150 && x < 480) t.SetPixel(x, y, route1);
                        else if (isChartBar) t.SetPixel(x, y, route2);
                        else if (isPanel) t.SetPixel(x, y, card);
                        else t.SetPixel(x, y, bg);
                    }
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

        // Construye el personaje 3D articulado (Ingeniero de Red UNAB) con formas redondeadas, espalda limpia y frente en +Z
        private static void BuildPlayerAvatar(Transform root, UNABSceneController ctrl)
        {
            GameObject playerRoot = new GameObject("PlayerAvatar_UNAB");
            playerRoot.transform.SetParent(root);
            // Inicia en la avenida exterior frente al Portico Principal de la UNAB mirando hacia el campus (-X)
            playerRoot.transform.localPosition = new Vector3(36.5f, 0f, 3.5f);

            GameObject visuals = new GameObject("AvatarVisuals");
            visuals.transform.SetParent(playerRoot.transform);
            visuals.transform.localPosition = Vector3.zero;
            visuals.transform.localEulerAngles = new Vector3(0f, -90f, 0f);

            Material skinMat = CreatePbrMat("AvatarSkin", new Color(0.92f, 0.76f, 0.64f), 0.02f, 0.35f);
            Material hairMat = CreatePbrMat("AvatarHair", new Color(0.10f, 0.08f, 0.07f), 0.05f, 0.4f);
            Material jacketMat = CreatePbrMat("AvatarJacketUNAB", new Color(0.08f, 0.16f, 0.32f), 0.08f, 0.45f);
            Material shirtMat = CreatePbrMat("AvatarShirt", new Color(0.95f, 0.96f, 0.98f), 0.02f, 0.3f);
            Material pantsMat = CreatePbrMat("AvatarPants", new Color(0.14f, 0.16f, 0.20f), 0.05f, 0.35f);
            Material shoeMat = CreatePbrMat("AvatarShoes", new Color(0.07f, 0.07f, 0.09f), 0.15f, 0.6f);
            Material lanyardMat = CreatePbrMat("AvatarLanyard", new Color(0.02f, 0.65f, 0.92f), 0.1f, 0.6f, emission: new Color(0.01f, 0.18f, 0.28f));

            // Torso redondeado (Espalda 100% azul marino en -Z; camisa blanca y fotocheck UNICAMENTE en el frente +Z)
            AddBox(visuals.transform, "Torso_Jacket", new Vector3(0f, 1.07f, 0f), new Vector3(0.34f, 0.48f, 0.19f), jacketMat, false);
            AddSphere(visuals.transform, "Shoulder_L", new Vector3(-0.18f, 1.26f, 0f), new Vector3(0.13f, 0.13f, 0.14f), jacketMat);
            AddSphere(visuals.transform, "Shoulder_R", new Vector3(0.18f, 1.26f, 0f), new Vector3(0.13f, 0.13f, 0.14f), jacketMat);
            AddBox(visuals.transform, "Shirt_FrontOnly", new Vector3(0f, 1.08f, 0.088f), new Vector3(0.11f, 0.44f, 0.02f), shirtMat, false);
            AddBox(visuals.transform, "Belt_Waist", new Vector3(0f, 0.81f, 0f), new Vector3(0.33f, 0.05f, 0.195f), shoeMat, false);

            // Cordon y Fotocheck UNAB unicamente en el pecho frontal (+Z)
            AddBox(visuals.transform, "Lanyard_L", new Vector3(-0.038f, 1.20f, 0.10f), new Vector3(0.016f, 0.20f, 0.008f), lanyardMat, false)
                .transform.localEulerAngles = new Vector3(0f, 0f, -12f);
            AddBox(visuals.transform, "Lanyard_R", new Vector3(0.038f, 1.20f, 0.10f), new Vector3(0.016f, 0.20f, 0.008f), lanyardMat, false)
                .transform.localEulerAngles = new Vector3(0f, 0f, 12f);
            AddBox(visuals.transform, "ID_Badge_Holder", new Vector3(0f, 1.05f, 0.102f), new Vector3(0.062f, 0.085f, 0.008f), shirtMat, false);
            AddBox(visuals.transform, "ID_Badge_Header", new Vector3(0f, 1.08f, 0.104f), new Vector3(0.056f, 0.02f, 0.009f), lanyardMat, false);

            // Cuello y Cabeza redondeada (Cabello cubre toda la nuca -Z y parte superior; rostro y lentes en +Z)
            AddCylinder(visuals.transform, "Neck", new Vector3(0f, 1.35f, 0f), new Vector3(0.10f, 0.05f, 0.10f), skinMat, false);
            GameObject headPivot = new GameObject("HeadPivot");
            headPivot.transform.SetParent(visuals.transform);
            headPivot.transform.localPosition = new Vector3(0f, 1.50f, 0f);

            AddSphere(headPivot.transform, "Head", Vector3.zero, new Vector3(0.22f, 0.25f, 0.23f), skinMat);
            AddSphere(headPivot.transform, "Hair_TopCap", new Vector3(0f, 0.045f, -0.015f), new Vector3(0.235f, 0.21f, 0.24f), hairMat);
            AddBox(headPivot.transform, "Hair_BackNape", new Vector3(0f, -0.02f, -0.065f), new Vector3(0.20f, 0.16f, 0.11f), hairMat, false);
            // Lentes en el frente (+Z)
            AddBox(headPivot.transform, "Glasses_Front", new Vector3(0f, 0.015f, 0.11f), new Vector3(0.15f, 0.032f, 0.018f), shoeMat, false);

            // Brazo Izquierdo Articulado
            GameObject leftArmPivot = new GameObject("LeftArmPivot");
            leftArmPivot.transform.SetParent(visuals.transform);
            leftArmPivot.transform.localPosition = new Vector3(-0.22f, 1.26f, 0f);
            AddCylinder(leftArmPivot.transform, "UpperArm_L", new Vector3(0f, -0.20f, 0f), new Vector3(0.095f, 0.21f, 0.095f), jacketMat, false);
            AddSphere(leftArmPivot.transform, "Hand_L", new Vector3(0f, -0.44f, 0f), new Vector3(0.085f, 0.095f, 0.085f), skinMat);

            // Brazo Derecho Articulado
            GameObject rightArmPivot = new GameObject("RightArmPivot");
            rightArmPivot.transform.SetParent(visuals.transform);
            rightArmPivot.transform.localPosition = new Vector3(0.22f, 1.26f, 0f);
            AddCylinder(rightArmPivot.transform, "UpperArm_R", new Vector3(0f, -0.20f, 0f), new Vector3(0.095f, 0.21f, 0.095f), jacketMat, false);
            AddSphere(rightArmPivot.transform, "Hand_R", new Vector3(0f, -0.44f, 0f), new Vector3(0.085f, 0.095f, 0.085f), skinMat);

            // Pierna Izquierda Articulada
            GameObject leftLegPivot = new GameObject("LeftLegPivot");
            leftLegPivot.transform.SetParent(visuals.transform);
            leftLegPivot.transform.localPosition = new Vector3(-0.09f, 0.78f, 0f);
            AddCylinder(leftLegPivot.transform, "Leg_L", new Vector3(0f, -0.35f, 0f), new Vector3(0.125f, 0.35f, 0.125f), pantsMat, false);
            AddBox(leftLegPivot.transform, "Shoe_L", new Vector3(0f, -0.74f, 0.03f), new Vector3(0.12f, 0.075f, 0.20f), shoeMat, false);

            // Pierna Derecha Articulada
            GameObject rightLegPivot = new GameObject("RightLegPivot");
            rightLegPivot.transform.SetParent(visuals.transform);
            rightLegPivot.transform.localPosition = new Vector3(0.09f, 0.78f, 0f);
            AddCylinder(rightLegPivot.transform, "Leg_R", new Vector3(0f, -0.35f, 0f), new Vector3(0.125f, 0.35f, 0.125f), pantsMat, false);
            AddBox(rightLegPivot.transform, "Shoe_R", new Vector3(0f, -0.74f, 0.03f), new Vector3(0.12f, 0.075f, 0.20f), shoeMat, false);

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
