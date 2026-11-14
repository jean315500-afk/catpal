# 노마드 마켓 흐름 운영 설정 (계정 · 환영 편지 · 매칭 · 이메일 알림)

QR 방문자가 첫 편지를 Sophie에게 보내면 Sophie & Tori의 환영 편지가 한 번 자동으로 와요. 그다음 "Meet your first CatPal"로 실제 참가자와 연결되고, 새 편지가 도착하면 이메일로 알림을 받아요.

이 문서는 운영에 올리기 전에 필요한 설정을 순서대로 정리한 거예요. 모든 단계는 **Supabase 권한이 있는 분**이 해야 해요.

> 앱 코드는 아래 1번 SQL이 적용된 뒤에 배포해야 해요. SQL을 적용하기 전에 새 코드를 배포하면 "새 캣팔에게 보내기"가 동작하지 않아요. 화면에는 "CatPal’s database is not set up yet."이 떠요.

## 1. DB 마이그레이션

Supabase → SQL Editor에서 아래 순서로 한 번씩 실행해요. 다시 실행해도 안전해요.

1. 아직 실행하지 않은 이전 `supabase/fix-*.sql`이 있으면 날짜 순서대로 먼저 실행해요.
2. `supabase/fix-2026-11-14-origin-country.sql`을 실행해요. 3번에도 같은 내용이 들어 있어서 건너뛰어도 돼요.
3. `supabase/fix-2026-11-14-nomad-market.sql`을 실행해요.

3번에서 무엇이 추가되는지는 파일 맨 위 설명에 있어요. 기존 테이블·데이터는 지우지 않아요. 기존 정책 중 바뀌는 것은 편지 사진 스토리지 정책 2개뿐이에요. 규칙은 그대로이고, 폴더 이름이 대화 ID일 때만 검사하도록 안전장치를 넣었어요.

## 2. 인증 (Authentication) 설정

| 위치 | 설정 |
|---|---|
| Sign In / Providers → Anonymous | **켜기**. 지금처럼 가입 양식 없이 시작해요. |
| Sign In / Providers → Email | **켜기**, **Confirm email 켜기** |
| URL Configuration → Site URL | `https://catpal.vercel.app` |
| URL Configuration → Redirect URLs | `https://catpal.vercel.app/**` (테스트 사이트를 쓰면 그 주소도 추가) |
| Emails → SMTP Settings | **Custom SMTP 필수**. 기본 메일 서버는 한 시간에 몇 통만 보내서 현장에서 바로 막혀요. Resend를 쓰면 Resend의 SMTP 정보를 넣으면 돼요. |

- 익명 사용자가 이메일을 등록하면 확인 메일이 가요(템플릿: "Change Email Address").
- 링크를 열어야 그 주소가 계정에 붙어요. 확인 전에는 알림 메일이 가지 않아요.
- 다른 기기에서는 로그인 링크(템플릿: "Magic Link")로 같은 편지함에 들어와요.

## 3. 운영 계정 (Sophie)과 환영 편지

임의 값은 넣어 두지 않았어요. 아래 값을 직접 넣어야 환영 편지가 동작해요.

1. **Sophie 계정 만들기:** Sophie가 앱에서 첫 편지를 쓰고, Settings → 이메일 등록 → 메일의 링크를 열어 확인을 끝내요.
2. **Tori 사진 올리기:** Storage → `letters` 버킷에 `welcome/tori.jpg` 경로로 올려요. 실제 Tori 사진이어야 해요.
3. **SQL Editor에서 설정:** 이메일 주소만 실제 값으로 바꿔서 실행해요.

```sql
update public.app_config
   set operator_id = (select id from auth.users where email = 'SOPHIE_EMAIL_HERE'),
       welcome_photo_path = 'welcome/tori.jpg'
 where id = 1;
update public.profiles set role = 'operator'
 where id = (select operator_id from public.app_config where id = 1);
```

**선택 설정**

| 항목 | 기본값 | 바꾸는 법 |
|---|---|---|
| 환영 문구 | 요청하신 문구 | `app_config.welcome_text_named`(`{name}` 자리에 고양이 이름), `welcome_text_unnamed` |
| 환영 편지 도착까지 걸리는 시간 | 20초 | `welcome_delay_seconds` |
| 편지 비행 시간 배율 | 1 (나라 간 거리 기준, 30분~24시간) | `travel_scale`. 현장에서 바로 도착하게 하려면 `0` |
| 후원 링크 | 없음 (버튼 숨김) | `donation_url = 'https://…'`를 넣으면 설정 화면과 첫 교환 완료 화면에 보여요 |
| 테스트 계정 | — | `update profiles set role='test' where id='…'`로 매칭에서 빼요 |
| 계정 정지 | — | `update profiles set status='blocked' where id='…'` |

## 4. 이메일 알림 함수 배포

```bash
supabase functions deploy notify-letters --no-verify-jwt
```

```bash
supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM_ADDRESS="letters@인증한도메인" APP_URL="https://catpal.vercel.app" CRON_SECRET="길고-무작위한-문자열"
```

- `MAIL_FROM_ADDRESS`는 Resend에서 인증한 도메인의 주소여야 해요. 보내는 사람은 `CatPal <그 주소>`로 표시돼요.
- 설정이 하나라도 빠지면 함수가 500과 빠진 항목을 돌려줘요. 그때는 아무것도 "보냄"으로 표시하지 않아요.

## 5. 1분마다 실행 (Supabase Cron)

Database → Extensions에서 `pg_cron`과 `pg_net`을 켜고, SQL Editor에서 실행해요. `CRON_SECRET`은 4번과 같은 값으로 바꿔요.

```sql
select cron.schedule('catpal-notify-letters', '* * * * *', $$
  select net.http_post(
    url := 'https://xitqzmycuycindtbwiyw.supabase.co/functions/v1/notify-letters',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', 'CRON_SECRET_HERE'),
    body := '{}'::jsonb)
$$);
```

**한 번 실행할 때 하는 일**
1. 캣팔을 기다리는 편지를 다시 매칭해요.
2. 보낼 메일을 가져와요. 실행 한 번이 메일 하나씩만 맡아서 같은 메일이 두 번 나가지 않아요.
3. 보내기 직전에 상태를 다시 확인해요. 그사이 읽었거나 알림을 껐으면 건너뛰어요.
4. 메일을 보내요.

실패하면 1분 뒤, 5분 뒤에 다시 시도해요. 최대 3번까지이고, 오류 내용이 기록돼요.

## 6. 상태 확인

```sql
select status, count(*) from public.email_notifications group by 1;
select kind, status, attempts, last_error from public.email_notifications order by created_at desc limit 20;
select status, count(*) from public.match_requests group by 1;
```

함수 로그에는 처리한 개수만 남아요. 이메일 주소나 링크는 남기지 않아요.

| 상태 | 뜻 |
|---|---|
| `sent` | 보냄 |
| `skipped` | 알림을 끈 사람, 이메일 미확인, 이미 읽은 편지 |
| `failed` | 다시 시도 예정이거나 3번 모두 실패. `last_error` 확인 |

## 끄기

- **알림 끄기:** `select cron.unschedule('catpal-notify-letters');`
- **환영 편지 끄기:** `update app_config set operator_id = null where id = 1;` 이후 첫 편지도 바로 매칭으로 가요.
