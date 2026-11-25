# Runbook — Unity TMP 폰트

마지막 적용: 2026-11-25

## ★ `HasCharacter()`로 글리프 결손을 판정하면 안 된다

```csharp
// ❌ 항상 통과한다 — 결손을 못 잡는다
fontAsset.HasCharacter(ch, searchFallbacks: true, tryAlternativeTypefaces: true);
```

**TMP는 못 찾은 글자를 이미 `□`(U+25A1)로 치환한 뒤 `characterInfo`에 넣는다.**
그래서 `characterInfo[i].character`를 검사하면 원본이 아니라 **치환 결과**를 보게 되고,
`□`는 어느 폰트에나 있으므로 언제나 `true`가 된다.

```csharp
// ✅ 올바른 판정 — 치환된 결과를 계수한다
int missing = 0;
for (int i = 0; i < text.textInfo.characterCount; ++i)
{
    if (text.textInfo.characterInfo[i].isVisible == false)
        continue;

    if (text.textInfo.characterInfo[i].character == '□')
        ++missing;
}
```

**검증 방법 자체를 먼저 검증한다.** [결함 주입 검증](verification-paths.md)에 따라 체인에 없는 글자를 넣어 검사가 실패하는지 1회 확인한 뒤 본 검사에 쓴다(2026-09-10: 치환된 글자 검사로 결손을 놓칠 뻔했다).

## 주 폰트와 폴백 체인은 다르다

**라틴 문자는 주 폰트에서 바로 해결돼 폴백을 타지 않는다.**
그래서 영문 모양을 바꾸려면 **폴백 체인이 아니라 주 폰트를 바꿔야 한다.**

거꾸로 CJK는 주 폰트에 없어 폴백으로 넘어가므로, 폴백 체인만 손대면 CJK만 바뀐다.

2026-09-10 실측: 도트 폰트 에셋이 있어도 주 폰트 배선이 산세리프면 영문 모양은 바뀌지 않았다.

## 폰트 교체는 두 필드가 한 쌍이다

`m_fontAsset`과 `m_sharedMaterial`을 **항상 같이** 바꾼다. 하나만 바꾸면 렌더는 되는데
머티리얼이 원본과 끊어져, 나중에 그 폰트 머티리얼을 고쳐도 그 텍스트만 안 따라온다.

### ⚠️ 머티리얼 fileID가 음수일 수 있다

폰트 머티리얼 서브에셋의 fileID는 **음수**일 수 있다. 정규식·입력 범위는 [검사기 런북](verification-scripts.md)을 따른다.

### 짝 검사

```
m_fontAsset 개수 == m_sharedMaterial 개수
```
파일별로 세서 어긋나면 그 파일에 누락이 있다.

## 커밋하면 안 되는 것 — 동적 폰트 아틀라스

`m_AtlasPopulationMode: 1`(Dynamic)인 폰트 에셋은 **에디터가 텍스트를 렌더할 때마다
글리프가 아틀라스에 쌓여 파일이 부푼다.** 어느 시점에 그 부푼 상태를 커밋하면
이후로 계속 더티가 뜬다.

- 기준선은 **비어 있는 상태**(`m_GlyphTable: []` / `m_CharacterTable: []`)다. 런타임에 다시 채워진다.
- 판단 기준은 "더티인가"가 아니라 **"기준선과 같은가"**다.
- ⚠️ `git checkout --`으로 되돌리면 안 된다 — **되돌리는 쪽이 부푼 오염본**일 수 있다.

`m_AtlasPopulationMode: 0`(Static)인 폰트는 이 현상이 없다.

## 새 문구를 넣기 전에 커버리지를 잰다

번역 문구를 추가할 때 **그 폰트에 글자가 있는지 먼저 확인한다.** 없으면 `□`가 된다.
TTF의 cmap을 직접 파싱하면 에디터 없이 잴 수 있다(format 4 / format 12 서브테이블).

**아틀라스에 없어도 폴백이 받아주면 `□`가 안 된다** — 체인 전체를 함께 봐야 한다.

## 도트 폰트로 바꾸면 폭이 크게 늘어난다

Press Start 2P 같은 8×8 격자 폰트는 라틴 문자도 CJK에 가까운 폭을 쓴다.
**기존 라벨·버튼 폭이 산세리프 기준으로 맞춰져 있으면 대부분 넘친다.**

교체 후 반드시 전수 측정한다:
```
preferredWidth vs rectTransform.rect.width
isTextOverflowing / isTextTruncated
```
**대상 프로젝트 지원 언어 전체를 각각 잰다.** 폴백이 달라 언어별 폭도 다르다. 긴 문구가 넘치면 축약과 레이아웃 재배치를 함께 검토한다(2026-09-10 실측: 필요 폭이 실제 폭의 4.2배였다).
