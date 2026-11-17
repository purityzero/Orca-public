using UnityEngine;
using UnityEngine.UI;
public class FrameStampQA : MonoBehaviour {
  public Text label;
  void LateUpdate() { label.text = $"F={Time.frameCount} T={Time.time:F2}"; }
}
var go = new GameObject("QA_FrameStamp", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
var canvas = go.GetComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceOverlay; canvas.sortingOrder = 32767;
var child = new GameObject("Stamp", typeof(RectTransform), typeof(Text)); child.transform.SetParent(go.transform, false);
var rect = child.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(0,1); rect.anchorMax = new Vector2(0,1); rect.pivot = new Vector2(0,1); rect.anchoredPosition = new Vector2(10,-10); rect.sizeDelta = new Vector2(1000,100);
var text = child.GetComponent<Text>(); text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = 56; text.color = Color.yellow; text.alignment = TextAnchor.UpperLeft;
go.AddComponent<FrameStampQA>().label = text;
return "created";
