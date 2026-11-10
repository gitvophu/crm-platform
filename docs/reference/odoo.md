# Odoo 19.0: mô hình dữ liệu và nghiệp vụ (tham chiếu cho CRM Nova Agency)

Phạm vi: Contacts, Sales Teams, CRM, Activities/Chatter, Sales, Subscriptions, Helpdesk, Live Chat, Portal.
Phương pháp: đọc trực tiếp source Community nhánh `19.0` trên GitHub (raw files) và docs chính thức `documentation/19.0`. Bản trước của tài liệu viết cho 18.0; mục "Khác so với 18.0" liệt kê chỗ đổi, có đối chiếu bằng cách diff file cùng tên giữa hai nhánh.
Subscriptions và Helpdesk là Enterprise, không có trong repo public: chỉ dựa vào docs, mọi tên kỹ thuật (model/field) của hai app này đánh dấu **(chưa xác minh)**.

Quy ước: "computed" = field tính toán (bỏ phần lớn, chỉ giữ cái có ý nghĩa nghiệp vụ). Kiểu field theo ORM Odoo: Char, Text, Html, Boolean, Integer, Float, Monetary, Date, Datetime, Selection, Many2one (M2O), One2many (O2M), Many2many (M2M).

Khái niệm bảo mật Odoo cần biết trước:

- **Access rights** (`ir.model.access.csv`): quyền CRUD theo model cho một group.
- **Record rules** (`ir.rule`): domain lọc bản ghi. Rule _có group_: các rule cùng áp cho user được OR với nhau. Rule _global_ (không group): AND với mọi thứ (thường là multi-company).
- **Group kế thừa** qua `implied_ids`: Manager ⊃ All Documents ⊃ Own Documents ⊃ Internal User. Từ 19.0 các group cùng app được gom dưới một `res.groups.privilege` (vd `sales_team.res_groups_privilege_sales`, category `base.module_category_sales`), group có `privilege_id` và `sequence`; danh sách user của group là `user_ids`, trên `res.users` là `group_ids` (18.0: `users`, `groups_id`).
- User có 3 loại: Internal (`base.group_user`), Portal (`base.group_portal`), Public (`base.group_public`). Portal/Public là "share user" (`res.users.share = True`).

---

## Khác so với 18.0

Đã xác minh bằng source/docs 19.0:

| Vùng                                         | 18.0                                                                            | 19.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Group/bảo mật chung                          | `res.groups` có `category_id`, `users`; `res.users.groups_id`                   | Thêm model `res.groups.privilege`; group có `privilege_id`, `sequence`; `user_ids`; `res.users.group_ids`; menu dùng `group_ids`. Group ẩn của `crm`/`sale` không còn `category_id`. `sales_team_security.xml` bỏ record gán `base.default_user` vào sale manager                                                                                                                                                                                                                                                                                       |
| Rule crm.lead, crm.team, res.partner         |                                                                                 | **Không đổi** (domain và group như 18.0). Access CSV của `crm` và `sales_team` không đổi                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Rule portal `sale.order` / `sale.order.line` | `message_partner_ids child_of commercial partner` (theo follower)               | **`partner_id child_of commercial partner`** (theo khách của đơn). Controller `/my/quotes`, `/my/orders` cũng lọc theo `partner_id`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Khách làm follower của đơn                   | `action_quotation_sent` và `action_confirm` gọi `message_subscribe(partner_id)` | Không còn `message_subscribe` trong `sale/models/sale_order.py`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `res.partner`                                | có `mobile`, `title` (model `res.partner.title`)                                | Bỏ `mobile`, bỏ `title` và model `res.partner.title`; thêm `main_user_id` (user "chính" của partner); nhãn `type`: Contact / Invoice / Delivery / Other; `company_type`: Person / Company; commercial fields = `_synced_commercial_fields()` (`['vat']`) + `company_registry`, `industry_id`                                                                                                                                                                                                                                                            |
| `res.partner.team_id`                        | không có (17.0 có)                                                              | Vẫn không có (`sales_team/models/` 19.0 chỉ có `crm_tag`, `crm_team`, `crm_team_member`, `res_users`)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `sale` trên partner/product                  | `sale_warn` (Selection) + `sale_warn_msg`; `sale_line_warn`                     | Chỉ còn `sale_warn_msg`, `sale_line_warn_msg`; đơn có `sale_warning_text`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `crm.lead`                                   |                                                                                 | Thêm `won_status` (Selection `won`/`lost`/`pending`, stored, tracking), `commercial_partner_id` ("Customer Company", không stored), `stage_id_color`; `partner_id` đổi nhãn thành "Contact"; bỏ `mobile`, `title`; thêm "rotting" (cảnh báo opportunity đứng yên)                                                                                                                                                                                                                                                                                       |
| Lost/archive                                 | `toggle_active` archive thì đặt probability 0 (archive = lost)                  | `action_set_lost` = archive + ghi `probability = 0`, `automated_probability = 0`. Archive đơn thuần **không** còn là lost (comment code: "a lead can be archived and not lost"). Thêm `action_restore`                                                                                                                                                                                                                                                                                                                                                  |
| `crm.stage`                                  | `team_id` M2O (một team)                                                        | **`team_ids` M2M** (một stage dùng cho nhiều team); thêm `color`, `rotting_threshold_days` ("Days to rot"); đổi `is_won` thì đặt lại probability 100 cho lead trong stage                                                                                                                                                                                                                                                                                                                                                                               |
| Convert lead                                 | wizard có 3 lựa chọn khách: create / exist / nothing                            | Còn `create`, `exist` (bỏ "Do not link to a customer"); docs: convert lead có probability 100% báo lỗi                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Assignment                                   |                                                                                 | `crm.team.member.assignment_domain_preferred`: lead khớp domain ưu tiên được gán trước (sắp theo probability giảm dần); `assignment_optout` đổi nhãn "Pause assignment"; lead "sống" = chưa won và còn active                                                                                                                                                                                                                                                                                                                                           |
| `crm.team`                                   | có thống kê `opportunities_count/amount/overdue_*`, `dashboard_graph_data`      | Bỏ các field thống kê đó. Setting CRM thêm `module_partnership`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sale.order.line`                            | `product_uom`, `tax_id`, packaging; `display_type` section/note                 | `product_uom_id`, `tax_ids`, bỏ packaging; `display_type` thêm `line_subsection`; thêm `parent_id` (section cha), `collapse_prices`, `collapse_composition`                                                                                                                                                                                                                                                                                                                                                                                             |
| Sản phẩm tuỳ chọn                            | `sale.order.option`, `sale.order.template.option`                               | **Bỏ cả hai model**. Thay bằng section có `is_optional` (trên `sale.order.line` và `sale.order.template.line`, module `sale_management`)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Huỷ đơn                                      | `action_cancel` có thể mở wizard `sale.order.cancel`                            | Bỏ wizard; `action_cancel` gọi thẳng `_action_cancel` (vẫn chặn đơn `locked`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `mail.activity`                              | xong thì xoá, trừ type có `keep_done`                                           | Xong thì **luôn archive** (giữ lịch sử), có field `feedback`; bỏ `keep_done`, bỏ `request_partner_id`; cron GC xoá activity quá hạn theo `mail.activity.gc.delete_overdue_years`                                                                                                                                                                                                                                                                                                                                                                        |
| Live chat                                    |                                                                                 | Thêm `im_livechat.expertise`, `im_livechat.channel.member.history`, `im_livechat.conversation.tag`; kênh có giới hạn phiên/operator (`max_sessions_mode`, `max_sessions`), `block_assignment_during_call`, `review_link`; rule có `chatbot_enabled_condition` (thay `chatbot_only_if_no_operator`); session có `livechat_status`, `livechat_outcome`, `livechat_end_dt`, tags, note, expertise, escalation (bỏ `livechat_active`, `anonymous_name`); chatbot step thêm `create_lead_and_forward`, `operator_expertise_ids`; lead có `origin_channel_id` |
| Rule live chat                               | Administrator thấy mọi `discuss.channel` livechat                               | `im_livechat_group_user` **đọc** mọi kênh livechat và member, call history                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Subscriptions (docs)                         |                                                                                 | Close có trường "When" (ngày đóng) và plan Closable cho chọn đóng theo ngày hoặc cuối kỳ; phải lập hoá đơn rồi mới Close, chưa lập thì Cancel; dashboard mặc định In Progress + Paused; Upsell có "Create Alternative"; Days không dùng cho subscription (dành cho Rental)                                                                                                                                                                                                                                                                              |
| Helpdesk (docs)                              |                                                                                 | Thêm phương thức gán "Dispatch tickets based on tags" (theo chuyên môn); "equal number of tickets" giờ đếm theo ticket chưa gán. Visibility không đổi                                                                                                                                                                                                                                                                                                                                                                                                   |
| Portal (docs)                                | Wizard có cột "In Portal"                                                       | Cửa sổ "Portal Access Management": Contact, Email, Latest Authentication, nút Grant Access / Revoke; cấp cho công ty thì cấp cho mọi contact của công ty                                                                                                                                                                                                                                                                                                                                                                                                |

Chưa xác minh ở 19.0: các cron Subscriptions (trang `scheduled_actions` 404 ở 19.0), automation rule MRR/Health (trang `automatic_alerts` 19.0 không có nội dung), `access_token`/route `auth="public"` vẫn như cũ (đã thấy trong `sale/controllers/portal.py` 19.0, nhưng chưa đọc lại `_document_check_access`).

---

## 1. Contacts (`res.partner`)

Nguồn: `odoo/addons/base/models/res_partner.py`, `base/security/base_security.xml`, `base/security/ir.model.access.csv`, `crm/models/res_partner.py`, `sale/models/res_partner.py` (19.0).

Một model duy nhất cho cả công ty, người, địa chỉ. Cây cha-con qua `parent_id`.

### Field chính

| Field                                                        | Kiểu                                                                                            | Ý nghĩa                                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `name`                                                       | Char                                                                                            | Tên                                                                                                             |
| `is_company`                                                 | Boolean                                                                                         | True = công ty, False = cá nhân                                                                                 |
| `company_type`                                               | Selection `person` (Person) / `company` (Company)                                               | Field giao diện (compute + inverse từ `is_company`), comment trong code: "do not use it in business logic"      |
| `parent_id`                                                  | M2O res.partner                                                                                 | "Related Company"                                                                                               |
| `child_ids`                                                  | O2M res.partner (`parent_id`)                                                                   | Contacts và địa chỉ con                                                                                         |
| `type`                                                       | Selection `contact` / `invoice` / `delivery` / `other` (nhãn Contact, Invoice, Delivery, Other) | Loại địa chỉ, mặc định `contact`                                                                                |
| `commercial_partner_id`                                      | M2O res.partner (computed, stored)                                                              | "Commercial Entity": chính nó nếu `is_company` hoặc không có cha; ngược lại = `parent_id.commercial_partner_id` |
| `commercial_company_name`                                    | Char (computed)                                                                                 | Tên công ty của thực thể thương mại                                                                             |
| `company_name`                                               | Char                                                                                            | Tên công ty gõ tay                                                                                              |
| `user_id`                                                    | M2O res.users "Salesperson"                                                                     | Người phụ trách nội bộ. Compute: contact cá nhân chưa có salesperson thì lấy theo `parent_id.user_id`           |
| `user_ids`                                                   | O2M res.users                                                                                   | User gắn với partner                                                                                            |
| `main_user_id`                                               | M2O res.users (computed)                                                                        | **Mới 19.0**: user "phù hợp nhất" khi partner có nhiều user                                                     |
| `category_id`                                                | M2M `res.partner.category` "Tags"                                                               | Nhãn (cây `parent_id`, `color`, `active`)                                                                       |
| `industry_id`                                                | M2O `res.partner.industry`                                                                      | Ngành (`name`, `full_name`, `active`)                                                                           |
| `function`                                                   | Char                                                                                            | Chức danh                                                                                                       |
| `email`, `phone`, `website`                                  | Char                                                                                            | Liên hệ (19.0 bỏ `mobile`)                                                                                      |
| `street`, `street2`, `zip`, `city`, `state_id`, `country_id` | Char/M2O                                                                                        | Địa chỉ                                                                                                         |
| `vat`, `company_registry`, `ref`                             | Char                                                                                            | MST, mã đăng ký, mã nội bộ                                                                                      |
| `lang`, `tz`                                                 | Selection                                                                                       |                                                                                                                 |
| `comment`                                                    | Html                                                                                            | Ghi chú                                                                                                         |
| `active`, `employee`                                         | Boolean                                                                                         |                                                                                                                 |
| `company_id`                                                 | M2O res.company                                                                                 | Multi-company, trống = dùng chung                                                                               |
| `partner_share`                                              | Boolean (computed, stored)                                                                      | True nếu là khách (không có user, hoặc user là share/portal)                                                    |
| `bank_ids`                                                   | O2M res.partner.bank                                                                            |                                                                                                                 |

19.0 đã bỏ `title` và model `res.partner.title`.
Field thêm bởi module khác: `crm` thêm `opportunity_ids` (domain `type = opportunity`), `opportunity_count`; `sale` thêm `sale_order_ids`, `sale_order_count`, `sale_warn_msg`.

**`team_id` trên partner**: không có ở 19.0 (cũng không có ở 18.0; 17.0 có ở `sales_team/models/res_partner.py`). Đội bán của đơn lấy theo salesperson.

### Đồng bộ cha → con

- Commercial fields = `_synced_commercial_fields()` (`['vat']`, sửa ở con thì đẩy lên thực thể thương mại) + `company_registry`, `industry_id`.
- Field địa chỉ sync từ cha xuống contact `type = contact`.
- Hoá đơn, đơn hàng, quyền portal đều quy về `commercial_partner_id`.

### Bảo mật (19.0, không đổi so với 18.0)

Access rights (base): `group_user` đọc; `group_partner_manager` CRUD; `group_portal`, `group_public` đọc. CRM: `group_sale_salesman` đọc/ghi/tạo partner và tag; `group_sale_manager` đọc.

| Rule                                  | Domain                                                                                                    | Group          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| `base.res_partner_rule`               | `['\|','\|',('partner_share','=',False),('company_id','parent_of',company_ids),('company_id','=',False)]` | global         |
| `base.res_partner_portal_public_rule` | `[('id','child_of',user.commercial_partner_id.id)]`, chỉ read                                             | portal, public |

=> Internal user thấy mọi partner (chỉ giới hạn theo công ty). Portal chỉ thấy cây partner của công ty mình.

---

## 2. Sales Teams (`crm.team`, `crm.team.member`)

Nguồn: `sales_team/models/crm_team.py`, `crm_team_member.py`, `res_users.py`, `crm/models/crm_team.py`, `crm_team_member.py`, `res_config_settings.py`, `sales_team/security/*` (19.0).

### `crm.team`

| Field                                                              | Kiểu                                                       | Ý nghĩa                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------- |
| `name`, `sequence`, `active`, `company_id`, `currency_id`, `color` |                                                            |                                        |
| `user_id`                                                          | M2O res.users "Team Leader"                                |                                        |
| `member_ids`                                                       | M2M res.users (qua `crm.team.member`)                      | "Salespersons", domain `share = False` |
| `crm_team_member_ids`                                              | O2M crm.team.member                                        |                                        |
| `is_membership_multi`                                              | Boolean (computed từ config `sales_team.membership_multi`) |                                        |
| (crm) `use_leads`, `use_opportunities`                             | Boolean                                                    | Team dùng bước Lead / Pipeline         |
| (crm) `alias_id`                                                   | mail alias                                                 | Email tới alias tạo lead               |
| (crm) `assignment_optout`                                          | Boolean                                                    | Bỏ qua auto-assign                     |
| (crm) `assignment_domain`                                          | Char                                                       | Bộ lọc lead team nhận                  |
| (crm) `assignment_max`                                             | Integer (computed)                                         | Tổng capacity/tháng                    |
| (crm) `lead_properties_definition`                                 | PropertiesDefinition                                       | Custom field cho lead của team         |

19.0 bỏ các field thống kê `opportunities_count`, `opportunities_amount`, `opportunities_overdue_*`, `dashboard_graph_data`.

### `crm.team.member`

| Field                                      | Kiểu                       | Ý nghĩa                                                                                |
| ------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------- |
| `crm_team_id`, `user_id`, `active`         |                            |                                                                                        |
| (crm) `assignment_domain`                  | Char                       | Bộ lọc lead của thành viên                                                             |
| (crm) `assignment_domain_preferred`        | Char                       | **Mới 19.0**: "Preference assignment Domain", lead khớp được ưu tiên gán cho người này |
| (crm) `assignment_optout`                  | Boolean "Pause assignment" |                                                                                        |
| (crm) `assignment_max`                     | Integer, mặc định 30       | Capacity 30 ngày                                                                       |
| (crm) `lead_day_count`, `lead_month_count` | computed                   |                                                                                        |

`res.users`: `crm_team_ids`, `crm_team_member_ids`, `sale_team_id`.

**Multi-team**: setting CRM "Multi Teams" (`is_membership_multi`, config `sales_team.membership_multi`). Tắt: một user một team (membership cũ bị archive kèm `member_warning`). Bật: nhiều team.

### Team mặc định (`_get_default_team_id`, không đổi)

(1) team user là member/leader khớp domain (lead → `use_leads`, opportunity → `use_opportunities`), ưu tiên `default_team_id` context, không thì theo `sequence`; (2) team của user bỏ domain; (3) default context; (4) team cùng công ty khớp domain; (5) team cùng công ty. Dùng cho `crm.lead._compute_team_id` (đổi user thì đổi team nếu user không thuộc team hiện tại) và `sale.order._compute_team_id`.

### Phân lead

1. **Thủ công**: chọn user/team, hoặc wizard Convert (chọn Salesperson thì Team tự điền); convert hàng loạt chia round-robin.
2. **Rule-Based Assignment**: Manually/Repeatedly (cron `_cron_assign_leads`) hoặc nút Assign Leads (chỉ sale manager/admin).
   - `_allocate_leads`: lead không team, không user, "chưa won và còn active", tạo trong `creation_delta_days` (mặc định 7), khớp `assignment_domain` của team; chọn team ngẫu nhiên có trọng số `assignment_max`; merge lead trùng khi gán.
   - `_assign_and_convert_leads`: quota theo ngày; **vòng 1 (mới 19.0)**: lead khớp `assignment_domain_preferred` của thành viên được gán trước, sắp theo probability giảm dần; vòng 2: round-robin theo số lead nhận trong 24h, thành viên phải khớp `assignment_domain`. Gán user xong thì tự convert thành opportunity.

### Bảo mật Sales (`sales_team/security/sales_team_security.xml` 19.0)

| Group                                      | Tên                      | sequence | implied                          | Ý nghĩa                |
| ------------------------------------------ | ------------------------ | -------- | -------------------------------- | ---------------------- |
| `sales_team.group_sale_salesman`           | User: Own Documents Only | 10       | `base.group_user`                | Dữ liệu của mình       |
| `sales_team.group_sale_salesman_all_leads` | User: All Documents      | 20       | salesman                         | Tất cả                 |
| `sales_team.group_sale_manager`            | Administrator            | 30       | all_leads, canned response admin | Cấu hình, báo cáo, xoá |

Cả ba thuộc privilege `sales_team.res_groups_privilege_sales` ("Sales").
Rule `crm.team`: `crm_rule_all_salesteam` `[(1,'=',1)]` cho All Documents; `sale_team_comp_rule` global multi-company. Access: `crm.team` đọc cho `group_user`, CRUD manager; `crm.team.member` tương tự; `crm.tag` CRU salesman, CRUD manager.

---

## 3. CRM (`crm.lead`, `crm.stage`, `crm.lost.reason`, `crm.tag`)

Nguồn: `crm/models/crm_lead.py`, `crm_stage.py`, `crm_lost_reason.py`, `crm_recurring_plan.py`, `crm/wizard/crm_lead_to_opportunity.py`, `crm/data/*`, `crm/security/*`, `mail/models/mail_tracking_duration_mixin.py` (19.0); docs convert, lost_opportunities, lead_scoring 19.0.

Lead và opportunity là cùng model `crm.lead`, phân biệt bằng `type`. Kế thừa `mail.thread.cc`, `mail.thread.blacklist`, `mail.thread.phone`, `mail.activity.mixin`, `utm.mixin`, `format.address.mixin`, `mail.tracking.duration.mixin` (đo thời gian ở mỗi stage, và từ 19.0 tính "rotting").

### `crm.lead` field chính

| Field                                                                              | Kiểu                                                                  | Ý nghĩa                                                                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `name`                                                                             | Char, required                                                        | Tiêu đề                                                                                    |
| `type`                                                                             | Selection `lead`/`opportunity`                                        | Mặc định `lead` nếu user có `crm.group_use_lead`                                           |
| `active`                                                                           | Boolean                                                               | Archive                                                                                    |
| `won_status`                                                                       | Selection `won`/`lost`/`pending` (computed, stored, tracking)         | **Mới 19.0**, xem bảng trạng thái                                                          |
| `user_id`                                                                          | M2O res.users "Salesperson"                                           | Mặc định user hiện tại, `share = False`                                                    |
| `team_id`                                                                          | M2O crm.team (computed từ user)                                       |                                                                                            |
| `company_id`                                                                       | M2O (computed: team > user > partner)                                 |                                                                                            |
| `stage_id`                                                                         | M2O crm.stage, `ondelete='restrict'`                                  | Domain `['\|',('team_ids','=',False),('team_ids','in',team_id)]`                           |
| `stage_id_color`                                                                   | Integer (related)                                                     | Mới 19.0                                                                                   |
| `priority`                                                                         | Selection `0` Low, `1` Medium, `2` High, `3` Very High                |                                                                                            |
| `tag_ids`                                                                          | M2M crm.tag                                                           |                                                                                            |
| `expected_revenue`, `prorated_revenue`                                             | Monetary                                                              | prorated = expected × probability / 100                                                    |
| `recurring_revenue`, `recurring_plan`, `recurring_revenue_monthly`                 | Monetary, M2O `crm.recurring.plan`, Monetary                          | Doanh thu định kỳ, Expected MRR (setting Recurring Revenues)                               |
| `probability`, `automated_probability`                                             | Float                                                                 | Xác suất thắng; sửa tay thì ngừng tự động                                                  |
| `date_deadline`                                                                    | Date "Expected Closing"                                               |                                                                                            |
| `date_open`, `date_closed`, `date_conversion`, `date_last_stage_update`            | Datetime                                                              |                                                                                            |
| `partner_id`                                                                       | M2O res.partner, nhãn **"Contact"** (18.0: "Customer")                |                                                                                            |
| `commercial_partner_id`                                                            | M2O res.partner "Customer Company" (computed, không stored, sửa được) | **Mới 19.0**: công ty của contact, hoặc công ty trùng tên `partner_name`                   |
| `partner_name`                                                                     | Char "Company Name"                                                   | Tên công ty tương lai                                                                      |
| `contact_name`, `function`                                                         | Char                                                                  | (19.0 bỏ `title`, `mobile`)                                                                |
| `email_from`, `phone`, `website`, địa chỉ, `lang_id`                               |                                                                       |                                                                                            |
| `lost_reason_id`                                                                   | M2O crm.lost.reason, `ondelete='restrict'`                            |                                                                                            |
| `description`                                                                      | Html                                                                  |                                                                                            |
| `referred`                                                                         | Char                                                                  |                                                                                            |
| `campaign_id`, `medium_id`, `source_id`                                            | UTM                                                                   |                                                                                            |
| `lead_properties`                                                                  | Properties                                                            | Theo team                                                                                  |
| `calendar_event_ids`, `duplicate_lead_ids`                                         |                                                                       |                                                                                            |
| `is_rotting`, `rotting_days`                                                       | (mixin, computed)                                                     | **Mới 19.0**: opportunity `pending` không cập nhật quá `stage.rotting_threshold_days` ngày |
| (sale_crm) `order_ids`, `quotation_count`, `sale_order_count`, `sale_amount_total` |                                                                       |                                                                                            |
| (crm_livechat) `origin_channel_id`                                                 | M2O discuss.channel                                                   | Mới 19.0: phiên chat tạo ra lead                                                           |

### `crm.stage` (19.0)

| Field                                                   | Kiểu                | Ý nghĩa                                                                         |
| ------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `name`, `sequence` (mặc định 1), `fold`, `requirements` |                     |                                                                                 |
| `is_won`                                                | Boolean             | Đổi giá trị: bật thì mọi lead trong stage ghi probability 100, tắt thì tính lại |
| `team_ids`                                              | **M2M crm.team**    | Trống = dùng chung; có giá trị = chỉ các team đó (18.0 là M2O `team_id`)        |
| `rotting_threshold_days`                                | Integer, mặc định 0 | "Days to rot", 0 = tắt                                                          |
| `color`                                                 | Integer             |                                                                                 |

Không có transition bắt buộc, kéo thả tự do. Dữ liệu mặc định: New (1), Qualified (2), Proposition (3), Won (70, `is_won`), mỗi stage có màu.
Stage mặc định: stage đầu không fold, chung hoặc chứa team của lead (`_stage_find` lọc `team_ids`).

### `crm.lost.reason`: `name`, `active`. Mẫu: "Too expensive", "We don't have people/skills", "Not enough stock".

### `crm.tag`: `name`, `color`. ### `crm.recurring.plan`: `name`, `number_of_months`, `active`, `sequence`.

### Trạng thái won / lost / pending (19.0)

`_compute_won_status`: `won` nếu `probability == 100` và `stage_id.is_won`; `lost` nếu `not active` và `probability == 0`; còn lại `pending`.

| Hành động                 | Hiệu ứng                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action_set_won()`        | Unarchive; chuyển sang stage won gần nhất phía sau stage hiện tại; probability 100                                                                                |
| `action_set_lost(**vals)` | Archive + ghi `probability = 0`, `automated_probability = 0` + vals (thường `lost_reason_id`). Wizard `crm.lead.lost`: Lost Reason, Closing Note (không bắt buộc) |
| `action_archive()`        | Chỉ archive, **không** thành lost (khác 18.0)                                                                                                                     |
| `action_unarchive()`      | Xoá `lost_reason_id`, tính lại probability tự động                                                                                                                |
| `action_restore()`        | Unarchive + đặt `probability = automated_probability` (bật lại tự động)                                                                                           |

### Lead → Opportunity

- Setting "Leads" bật group `crm.group_use_lead`; tắt riêng từng team bằng `use_leads`.
- Wizard `crm.lead2opportunity.partner`: Conversion Action = Convert / Merge with existing opportunities; Salesperson/Team; Related Customer = `create` (tạo từ lead: công ty từ `partner_name`, contact con từ `contact_name`) hoặc `exist` (19.0 bỏ lựa chọn "Do not link").
- `_convert_opportunity_data`: `type = 'opportunity'`, `date_conversion = now`, gán `partner_id`, đặt stage nếu chưa có. `convert_opportunity` bỏ qua lead inactive hoặc probability 100; docs 19.0: convert lead 100% báo lỗi.
- Merge: gộp vào bản tạo sớm nhất, kết quả là opportunity.

### Bảo mật CRM (19.0, không đổi)

Access: `crm.lead` CRU salesman, CRUD manager; `crm.stage` đọc user, CRUD manager; `crm.lost.reason` đọc, CRUD manager; `crm.recurring.plan` đọc salesman, CRUD manager.

| Rule                                        | Model                         | Domain                                                 | Group                           |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------- |
| `crm_rule_personal_lead`                    | crm.lead                      | `['\|',('user_id','=',user.id),('user_id','=',False)]` | `group_sale_salesman`           |
| `crm_rule_all_lead`                         | crm.lead                      | `[(1,'=',1)]`                                          | `group_sale_salesman_all_leads` |
| `crm_lead_company_rule`                     | crm.lead                      | `[('company_id','in',company_ids+[False])]`            | global                          |
| Personal / All Activities                   | crm.activity.report           | như trên                                               | như trên                        |
| Manager can manage lead plans (+ templates) | mail.activity.plan(.template) | `res_model = 'crm.lead'`                               | `group_sale_manager`            |

Group ẩn `crm.group_use_lead` ("Show Lead Menu"), `crm.group_use_recurring_revenues`.
=> "Own Documents" thấy lead của mình và lead chưa gán ai; không có rule theo team.

---

## 4. Activities và Chatter (`mail`)

Nguồn: `mail/models/mail_activity.py`, `mail_activity_type.py`, `mail_message.py`, `mail_followers.py`, `mail/security/mail_security.xml` (19.0). `mail_thread.py` chưa đọc lại ở 19.0.

### `mail.activity`

| Field                                                                                                | Kiểu                                        | Ý nghĩa                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| `res_model`, `res_model_id`, `res_id`, `res_name`                                                    |                                             | Bản ghi đích (polymorphic)          |
| `activity_type_id`                                                                                   | M2O mail.activity.type                      |                                     |
| `summary`, `note`                                                                                    | Char, Html                                  |                                     |
| `date_deadline`                                                                                      | Date, required                              |                                     |
| `date_done`                                                                                          | Date                                        |                                     |
| `feedback`                                                                                           | Text                                        | **Mới 19.0**: phản hồi khi làm xong |
| `user_id`                                                                                            | M2O res.users                               | Người được giao                     |
| `state`                                                                                              | computed `overdue`/`today`/`planned`/`done` |                                     |
| `automated`, `previous_activity_type_id`, `recommended_activity_type_id`, `attachment_ids`, `active` |                                             |                                     |

19.0 bỏ `request_partner_id`.
Hoàn thành (`_action_done`): post message lên chatter (subtype `mail.mt_activities`), tạo activity kế tiếp nếu type có trigger, rồi **archive activity** ("once done, archive to keep history"); bản ghi đích đã mất thì xoá. Cron GC xoá activity quá hạn lâu hơn `mail.activity.gc.delete_overdue_years` năm (0 = tắt).

### `mail.activity.type`

`name`, `summary`, `sequence`, `active`, `icon`, `delay_count`, `delay_unit` (`days`/`weeks`/`months`), `delay_from` (`current_date`/`previous_activity`), `category` (`default`/`upload_file`/`phonecall`), `decoration_type`, `res_model`, `chaining_type` (`suggest`/`trigger`), `triggered_next_type_id`, `suggested_next_type_ids`, `default_user_id`, `default_note`, `mail_template_ids`. 19.0 bỏ `keep_done`.

Activity plans (`mail.activity.plan`, `.template`): sale manager quản lý plan cho `crm.lead`, `sale.order`.
Rule `mail_activity_rule_user` (group_user, không đổi): ghi/xoá khi `user_id = user` hoặc `create_uid = user`; đọc theo bản ghi đích.

### Chatter

`mail.thread`: `message_ids`, `message_follower_ids`, `message_partner_ids`, tracking (`mail.tracking.value`). `mail.activity.mixin`: `activity_ids`, `activity_state`, `activity_user_id`...

`mail.message`: `model`, `res_id`, `record_name`, `body`, `subject`, `date`, `message_type` (`email`, `comment`, `email_outgoing`, `notification`, `auto_comment`, `user_notification`), `subtype_id`, `is_internal` (ẩn với portal), `author_id`, `email_from`, `partner_ids`, `parent_id`, `child_ids`, `attachment_ids`, `tracking_value_ids`, `mail_activity_type_id`, `starred_partner_ids`, `reaction_ids`. 19.0 thêm `incoming_email_to`, `incoming_email_cc`, `outgoing_email_to`, `linked_message_ids`, `message_link_preview_ids` (thay `link_preview_ids`).
Quyền đọc message: tác giả, người tạo, người nhận, được notify, hoặc đọc được bản ghi đích (docstring `_check_access` 18.0, **chưa xác minh ở 19.0**).

`mail.followers` (không đổi): `res_model`, `res_id`, `partner_id`, `subtype_ids`. Follower là partner, vẫn là cơ chế cấp quyền portal cho nhiều model (Helpdesk), nhưng **không còn** cho `sale.order` ở 19.0 (xem mục 9).

---

## 5. Sales (`sale.order`, `sale.order.line`, product, pricelist, template)

Nguồn: `sale/models/sale_order.py`, `sale_order_line.py`, `product_template.py`, `res_partner.py`, `sale/security/*`, `sale/controllers/portal.py`, `sale_crm/models/*`, `sale_management/models/*`, `product/models/*` (19.0).

### Product cho dịch vụ

`product.template` / `product.product`. `type`: `consu` (Goods), `service`, `combo`; `service_tracking` (mặc định `no`); `list_price`; `sale_ok`; `uom_id`, `uom_ids` (19.0, bỏ `uom_po_id`, `uom_category_id`), `categ_id`; `pricelist_rule_ids` (19.0). Module sale: `invoice_policy` (`order`/`delivery`), `service_type` (`manual`), `expense_policy`, `sale_line_warn_msg`.

### `sale.order`

Báo giá và đơn là cùng bản ghi. Kế thừa `portal.mixin`, `product.catalog.mixin`, `mail.thread`, `mail.activity.mixin`, `utm.mixin`.

| Field                                                                       | Kiểu                                                                             | Ý nghĩa                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `name`                                                                      | Char                                                                             | Số chứng từ                                                               |
| `state`                                                                     | `draft` Quotation, `sent` Quotation Sent, `sale` Sales Order, `cancel` Cancelled | Không đổi                                                                 |
| `locked`                                                                    | Boolean                                                                          | Đơn khoá                                                                  |
| `partner_id`                                                                | M2O, required                                                                    | Khách                                                                     |
| `partner_invoice_id`, `partner_shipping_id`                                 | M2O (computed từ `address_get`)                                                  |                                                                           |
| `date_order`                                                                | Datetime                                                                         | Ngày tạo khi draft/sent, ngày xác nhận khi `sale`                         |
| `validity_date`                                                             | Date "Expiration"                                                                | Mặc định `today + company.quotation_validity_days`                        |
| `pricelist_id`, `currency_id`, `payment_term_id`, `fiscal_position_id`      | M2O                                                                              | Pricelist mặc định `partner.property_product_pricelist`                   |
| `user_id`                                                                   | M2O "Salesperson"                                                                | Mặc định salesperson của partner → của commercial partner → user hiện tại |
| `team_id`                                                                   | M2O crm.team                                                                     | `_get_default_team_id`                                                    |
| (sale_crm) `opportunity_id`                                                 | M2O crm.lead, domain `type = opportunity`                                        |                                                                           |
| `origin`, `client_order_ref`, `note`, `tag_ids`, UTM, `commitment_date`     |                                                                                  |                                                                           |
| `order_line`                                                                | O2M                                                                              |                                                                           |
| `amount_untaxed`, `amount_tax`, `amount_total`                              | Monetary                                                                         |                                                                           |
| `invoice_status`                                                            | `upselling`/`invoiced`/`to invoice`/`no`                                         |                                                                           |
| `require_signature`, `require_payment`, `prepayment_percent`                |                                                                                  | Ký/trả online                                                             |
| `signature`, `signed_by`, `signed_on`                                       |                                                                                  |                                                                           |
| `transaction_ids`, `amount_paid`, `preferred_payment_method_line_id` (19.0) |                                                                                  |                                                                           |
| `sale_warning_text` (19.0), `pending_email_template_id` (19.0)              |                                                                                  |                                                                           |
| (sale_management) `sale_order_template_id`                                  | M2O                                                                              | (19.0 bỏ `sale_order_option_ids`)                                         |
| `access_token`, `access_url`                                                | portal.mixin                                                                     |                                                                           |

### Chuyển trạng thái (19.0)

```
draft --(action_quotation_sent)--> sent
draft|sent --(action_confirm; hoặc khách ký/trả trên portal)--> sale
* --(action_cancel, không locked)--> cancel      (không còn wizard sale.order.cancel)
cancel|sent --(action_draft: xoá chữ ký)--> draft
sale --(action_lock / action_unlock)--> locked
```

- `action_quotation_sent`: chỉ từ draft, ghi `state = sent`. 19.0 **không** subscribe khách làm follower.
- `action_confirm`: `_confirmation_error_message` (chỉ draft/sent, dòng phải có sản phẩm), validate analytic, ghi `_prepare_confirmation_values()`. `sale_crm`: nâng `expected_revenue` của opportunity lên `amount_untaxed` nếu lớn hơn và cùng tiền tệ; không tự đánh Won.
- Portal `/my/orders/<id>/accept` (jsonrpc, auth public): cần `_has_to_be_signed()`, ghi chữ ký, không cần trả thì `_validate_order()`. Decline: đang chờ ký và có lời nhắn → `_action_cancel()`.

### `sale.order.line` (19.0)

`order_id`, `sequence`, `display_type` (`line_section` / `line_subsection` / `line_note` / False), `parent_id` (section cha), `collapse_prices`, `collapse_composition`, `product_id`, `product_template_id`, `name`, `product_uom_qty`, `product_uom_id`, `price_unit`, `discount`, `tax_ids`, `price_subtotal`/`price_tax`/`price_total`, `pricelist_item_id`, `qty_delivered`, `qty_delivered_method`, `qty_invoiced`, `qty_to_invoice`, `invoice_status`, `invoice_lines`, `salesman_id`, `order_partner_id`, `state`, `is_downpayment`, `customer_lead`, `sale_line_warn_msg`. (sale_management) `is_optional`: section mà các dòng là tuỳ chọn trên portal.

### Quotation template (`sale_management`, 19.0)

`sale.order.template`: `name`, `active`, `company_id`, `note`, `sequence`, `mail_template_id`, `number_of_days`, `require_signature`, `require_payment`, `prepayment_percent`, `sale_order_template_line_ids`, `journal_id`. Không còn `sale_order_template_option_ids`.
`sale.order.template.line`: `sale_order_template_id`, `sequence`, `product_id`, `name`, `product_uom_id`, `product_uom_qty`, `display_type` (section / subsection / note), `parent_id`, `is_optional`.
Sản phẩm tuỳ chọn ở 19.0 = dòng nằm trong section `is_optional` (model `sale.order.option` đã bỏ).

### Pricelist (19.0)

`product.pricelist`: `name`, `active`, `sequence`, `currency_id`, `company_id`, `country_group_ids`, `item_ids`.
`product.pricelist.item`: `pricelist_id`, `applied_on` (`3_global`/`2_product_category`/`1_product`/`0_product_variant`), `categ_id`, `product_tmpl_id`, `product_id`, `min_quantity`, `date_start`, `date_end`, `compute_price` (`fixed`/`percentage`/`formula`), `fixed_price`, `percent_price`, `base` (`list_price`/`standard_price`/`pricelist`), `base_pricelist_id`, `price_discount`, `price_surcharge`, `price_round`, `price_markup`, `price_min_margin`, `price_max_margin`, `is_pricelist_required` (19.0).

### Bảo mật Sales (19.0)

Access: `sale.order` CRU salesman, CRUD manager, đọc portal; `sale.order.line` CRUD salesman, đọc portal. Group ẩn: `sale.group_auto_done_setting`, `group_discount_per_so_line`, `group_warning_sale`, `group_proforma_sales`. 19.0 bỏ access cho wizard `sale.order.cancel`, `sale.payment.provider.onboarding.wizard` và nhiều access product/uom cấp cho sale manager trong CSV của `sale`.

| Rule                                                               | Model           | Domain                                                            | Group                |
| ------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------- | -------------------- |
| `sale_order_comp_rule` (+ line, report)                            | sale.order      | `[('company_id','in',company_ids)]`                               | global               |
| `sale_order_personal_rule`                                         | sale.order      | `['\|',('user_id','=',user.id),('user_id','=',False)]`            | salesman             |
| `sale_order_see_all`                                               | sale.order      | `[(1,'=',1)]`                                                     | all_leads            |
| `sale_order_line_personal_rule`                                    | sale.order.line | `['\|',('salesman_id','=',user.id),('salesman_id','=',False)]`    | salesman             |
| `sale_order_line_see_all`                                          | sale.order.line | `[(1,'=',1)]`                                                     | all_leads            |
| `sale_order_rule_portal`                                           | sale.order      | **`[('partner_id','child_of',[user.commercial_partner_id.id])]`** | portal               |
| `sale_order_line_rule_portal`                                      | sale.order.line | **`[('order_id.partner_id','child_of',[...])]`**                  | portal               |
| `account_invoice_rule_see_personal` / `_see_all`                   | account.move    | hoá đơn bán, `invoice_user_id` mình/trống / tất cả                | salesman / all_leads |
| `payment_transaction_salesman_rule`, `payment_token_salesman_rule` | payment.*       | `[(1,'=',1)]`                                                     | salesman             |

---

## 6. Subscriptions (Enterprise, chỉ theo docs 19.0)

Nguồn: docs `sales/subscriptions*` 19.0. Không có source public.

Subscription là **sales order có Recurring Plan**. Renewal/upsell là sales order khác liên kết đơn gốc (smart button "Sales History").
Tên kỹ thuật (`sale.subscription.plan`, `plan_id`, `subscription_state`, `next_invoice_date`, `recurring_monthly`, `close_reason_id` → `sale.order.close.reason`...) **(chưa xác minh)**.

### Recurring Plan (Subscriptions ‣ Configuration ‣ Recurring Plans)

Docs 19.0: có sẵn plan phổ biến "such as Monthly and Yearly". Form: Name, DETAILS, SELF-SERVICE, Pricing.

- **Billing Period**: Weeks/Months/Years. Days không dùng được cho subscription (đơn vị ngày dành cho Rental, tránh hoá đơn hằng ngày).
- **Automatic Closing** (ngày không thanh toán thì tự đóng), **Align to Period Start**, **Company**, **Invoice Email Template**.
- Self-service: **Closable** (19.0: thêm lựa chọn đóng vào ngày khách chọn hoặc cuối kỳ hiện tại), **Add Products** (tạo Upsell quotation), **Renew** (tạo Renewal quotation), **Optional Plans** (đổi plan).
- **Pricing tab**: giá theo product/variant/pricelist, ưu tiên hơn giá trên product.
- Smart buttons: Subscriptions, Subscription Items.

### Trạng thái (nhãn docs 19.0)

Quotation → Confirm → **In Progress** → **Paused** (dashboard mặc định hiện In Progress và Paused; cách tạm dừng chưa mô tả: chưa xác minh) → **Churned** (đóng trong backend) / **Closed** (nhãn trên portal; trong database là Churned). Báo cáo group theo "Subscription State" (Quotation, In Progress, Churned...). Renewal có tag Renewal Quotation, upsell có icon Upsell.

### Luồng

- **Tạo**: quotation có Customer, Recurring Plan, Order Lines, Expiration, Payment Terms; Send/Confirm; Online signature/payment như sale. eCommerce tự tạo và xác nhận.
- **Hoá đơn định kỳ**: theo Next Invoice và payment token (docs 18.0; trang `scheduled_actions` 19.0 trả 404, **chưa xác minh ở 19.0**). Trang automatic_payments 19.0 vẫn mô tả "Contract in exception" khi thanh toán tự động lỗi.
- **Renew**: điều kiện: đã confirm, có plan, hoá đơn đầu đã lập và đã ghi nhận thanh toán. Nút Renew → Renewal Quotation → confirm.
- **Upsell**: đơn phải đã lập hoá đơn. Nút Upsell → quotation có sẵn dòng gốc, chatter liên kết đơn gốc; giá prorate theo kỳ hiện tại (chỉ Service). Confirm → cộng vào subscription. 19.0: **Create Alternative** tạo upsell thay thế liên kết cùng subscription.
- **Close** (19.0): chỉ đóng được subscription đã lập hoá đơn, chưa lập thì Cancel. Admin: nút Close → form có **When** (ngày đóng) + Reason → chatter ghi lý do, banner Churned. Khách: portal ‣ Subscriptions ‣ Close Subscription, chỉ chọn lý do có sẵn (Configuration ‣ Close Reasons).
- **Báo cáo**: Subscriptions Analysis, Retention, MRR Breakdown, MRR Timeline; filter In Progress, Paused, Churned.

CRM community có `crm.lead.recurring_revenue`, `recurring_plan` (`crm.recurring.plan`, khác plan của Subscriptions), `recurring_revenue_monthly`.

---

## 7. Helpdesk (Enterprise, chỉ theo docs 19.0)

Nguồn: docs `services/helpdesk*` 19.0. Tên model `helpdesk.team`, `helpdesk.ticket`, `helpdesk.stage`, `helpdesk.sla`, `helpdesk.tag` và mọi tên field là tên giao diện, tên kỹ thuật **(chưa xác minh)**.

### Helpdesk Team

- Name, Description (công khai trên form web), Company.
- **Visibility** (không đổi so với 18.0): _Invited internal users (private)_: internal chỉ thấy ticket mình follow; _All internal users (company)_: mọi internal thấy mọi ticket; _Invited portal users and all internal users (public)_: internal thấy hết, portal chỉ thấy ticket mình follow. Đổi từ public sang private/company thì portal follower bị gỡ.
- **Follow All Team's Tickets**: follower nhận mọi cập nhật (cả contact ngoài).
- **Automatic Assignment**: _Assign tickets based on workload_: "Each user is assigned an equal number of tickets" (19.0: theo tổng ticket chưa gán) hoặc "Each user has an equal number of open tickets"; _Assign tickets based on expertise_ (**mới 19.0**): "Dispatch tickets based on tags", cấu hình mỗi Ticket Tag do những thành viên nào xử lý; ticket không có tag thì không được gán. Team Members (trống = mọi nhân viên có quyền); người nghỉ phép không được gán.
- **Channels**: Email Alias, Live Chat (`/ticket`), Website Form/Help Center.
- **Performance**: SLA Policies, Working Hours. **Self-Service**: Automatic Closing, khách tự đóng, Ratings.

### Ticket

Tiêu đề, Team, Customer, người phụ trách, **Priority** 0 Low / 1 Medium / 2 High / 3 Urgent, Tags, Stage, Description, SLA deadline/tag, Sales Order Items.

- Stage theo team; ticket đóng khi vào stage "Folded in Kanban".
- **Convert to Opportunity/Lead**: tạo/link khách, Sales Team, Salesperson → ticket archive, link trong chatter.
- **Merge** ticket (cần Data Cleaning).

### SLA Policy (docs 19.0, không đổi)

Criteria: Team (bắt buộc), Priority (trống = Low), Tags, Customers, Services. Target: Reach Stage + thời gian làm việc; Excluding Stages. Deadline từ ngày tạo; nhiều SLA → hiện sớm nhất; đạt → xanh; trễ → đỏ và giữ đỏ. Báo cáo SLA Status Analysis.

---

## 8. Live Chat (`im_livechat`)

Nguồn: `im_livechat/models/im_livechat_channel.py`, `chatbot_script.py`, `chatbot_script_step.py`, `discuss_channel.py`, `im_livechat_expertise.py`, `im_livechat/security/im_livechat_channel_security.xml`, `crm_livechat/models/*` (19.0); docs livechat, chatbots, responses 19.0.

### Model

| Model                                                                      | Field chính (19.0)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `im_livechat.channel`                                                      | `name`, `user_ids` (Operators), `channel_ids` (Sessions), `rule_ids`, `default_message`, `button_text`, màu; **mới**: `max_sessions_mode` (`unlimited`/`limited`), `max_sessions` (mặc định 10, phiên đồng thời/operator), `block_assignment_during_call`, `review_link`, `ongoing_session_count`, `remaining_session_capacity` (bỏ `input_placeholder`)                                                                                                                                                                                  |
| `im_livechat.channel.rule`                                                 | `channel_id`, `regex_url`, `action` (`display_button`/`display_button_and_text`/`auto_popup`/`hide_button`), `auto_popup_timer`, `chatbot_script_id`, **`chatbot_enabled_condition`** (`always`/`only_if_no_operator`/`only_if_operator`, thay `chatbot_only_if_no_operator`), `country_ids`, `sequence`                                                                                                                                                                                                                                  |
| `discuss.channel` (một cuộc chat)                                          | `channel_type = 'livechat'`, `livechat_channel_id`, `livechat_operator_id`, `country_id`, `chatbot_current_step_id`, `chatbot_message_ids`, `duration`; **mới**: `livechat_status` (`in_progress`/`waiting`/`need_help`), `livechat_outcome` (`no_answer`/`no_agent`/`no_failure`/`escalated`), `livechat_end_dt`, `livechat_note`, `livechat_conversation_tag_ids`, `livechat_expertise_ids`, `livechat_lang_id`, `livechat_is_escalated`, lịch sử agent/bot/customer (`livechat_*_history_ids`); bỏ `livechat_active`, `anonymous_name` |
| `im_livechat.expertise` (mới)                                              | `name`, `user_ids`: chuyên môn của operator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `im_livechat.conversation.tag`, `im_livechat.channel.member.history` (mới) | Tag hội thoại, lịch sử thành viên (field chưa đọc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `chatbot.script`                                                           | `title`, `active`, `script_step_ids`, `operator_partner_id`, utm source                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `chatbot.script.step`                                                      | `name`, `message` (19.0 là Html), `sequence`, `step_type` (`text`, `question_selection`, `question_email`, `question_phone`, `forward_operator`, `free_input_single`, `free_input_multi`; `crm_livechat` thêm `create_lead`, **`create_lead_and_forward`** + `crm_team_id`), `answer_ids`, `triggering_answer_ids`, `is_forward_operator`, `operator_expertise_ids` (forward theo chuyên môn)                                                                                                                                             |

### Chọn operator

`_get_operator(previous_operator_id, lang, country_id, expertises, users)`: ưu tiên operator cũ; khớp ngôn ngữ, **chuyên môn (19.0)**, quốc gia; ưu tiên người không có chat active (message trong 30 phút); không thì ít chat nhất, không trong cuộc gọi; ngẫu nhiên trong nhóm ngang nhau. Giới hạn phiên theo `max_sessions` nếu `limited`.

### Chuyển thành lead/ticket

- `/lead <tiêu đề>`: tạo `crm.lead` với `user_id = False`, `team_id = False`, partner khách nếu không ẩn danh, mô tả = lịch sử chat, `origin_channel_id` = phiên (19.0). `discuss.channel.lead_ids` (group salesman): kênh truy cập được với sales user khi có lead.
- Chatbot step `create_lead` / `create_lead_and_forward` (tạo lead rồi chuyển operator).
- `/ticket`, `/search_tickets` (Helpdesk), `/help`, `/history`, `/leave`, canned responses (docs 19.0 không đổi).

### Bảo mật (19.0)

Groups `im_livechat.im_livechat_group_user` (User), `im_livechat_group_manager` (Administrator), thuộc privilege "Live Chat". Rules: `im_livechat_group_user` **đọc** mọi `discuss.channel` có `channel_type = 'livechat'`, mọi member của chúng (kèm mời), mọi call history của chúng. (18.0: rule cho Administrator.)

---

## 9. Portal

Nguồn: `portal/wizard/portal_wizard.py`, `portal/models/portal_mixin.py`, `sale/controllers/portal.py`, `sale/security/ir_rules.xml`, `base/security/base_security.xml` (19.0); docs `general/users/user_portals*` 19.0.

- **Portal user** = `res.users` thuộc `base.group_portal`. Cấp qua Action ‣ Grant portal access trên contact: cửa sổ "Portal Access Management" (Contact, Email, Latest Authentication), nút **Grant Access** / **Revoke** (19.0). `action_grant_access`: tạo/kích hoạt user, ghi `group_ids` thêm portal, bỏ public. Cấp cho công ty thì mọi contact liên kết đều được cấp, gỡ từng người nếu cần.
- Docs: portal chỉ xem (read/view); khách xem/trả đơn, quản lý subscription, sửa thông tin cá nhân, mật khẩu, 2FA.
- **Cơ chế thấy tài liệu**:
  - `sale.order` (19.0): rule `partner_id child_of user.commercial_partner_id`, tức mọi contact của công ty khách thấy đơn mà khách là công ty mình hoặc contact trong công ty, **không cần là follower** (18.0 theo follower). `/my/quotes`: `partner_id child_of` + `state = 'sent'`; `/my/orders`: + `state = 'sale'`.
  - Helpdesk: vẫn theo follower khi team public (docs).
  - `res.partner`: đọc cây `child_of` commercial partner.
- **Link có token** (`portal.mixin`: `access_token`, `access_url`, `get_portal_url`, `_get_share_url`): route `/my/orders/<id>` `auth="public"`, ký/decline/trả qua token, ghi bằng `sudo` sau kiểm tra.
- Message `is_internal` không hiện với portal.
- Leads/opportunities trên portal là tính năng cho đối tác/reseller (19.0 có setting `module_partnership` trong CRM) **(chưa xác minh chi tiết)**.

---

## Quy trình end-to-end

### A. Lead → Opportunity → Quotation → Sales Order → Subscription → Renewal

1. **Lead vào**: email alias, form web, `/lead` hoặc chatbot (`create_lead`, `create_lead_and_forward`), nhập tay. UTM ghi nguồn, lead từ chat có `origin_channel_id`.
2. **Phân bổ**: rule-based assignment gán team (domain, capacity, merge trùng) rồi gán salesperson (lead "preferred" trước, rồi round-robin) và tự convert.
3. **Qualify**: activity, chatter. Convert: tạo hoặc link partner (19.0 bắt buộc một trong hai), `type = opportunity`.
4. **Pipeline**: kéo stage (stage chung hoặc theo nhiều team), cập nhật revenue, deadline, priority; probability PLS; opportunity đứng yên quá ngưỡng stage thì "rotting".
5. **Quotation**: từ opportunity, `sale.order` draft với `opportunity_id`, partner, team, tag, UTM. Template: dòng, section/subsection, section tuỳ chọn (`is_optional`), hiệu lực, ký/trả online.
6. **Gửi**: `state = sent`, khách nhận link portal có token (19.0 không tự thêm follower; khách vẫn thấy trong `/my` nhờ rule `partner_id`).
7. **Chấp nhận**: ký/trả trên portal → xác nhận; hoặc Confirm. Expected revenue opportunity được nâng.
8. **Won**: salesperson đánh Won (`won_status = won`). Lost: Lost + lý do (`won_status = lost`).
9. **Hoá đơn** theo `invoice_policy`.
10. **Subscription** (Enterprise): đơn có Recurring Plan → In Progress; hoá đơn định kỳ.
11. **Renew/Upsell/Close**: Renew → Renewal Quotation; Upsell (prorate, có Create Alternative); Close với When + Reason → Churned (chưa hoá đơn thì Cancel).

### B. Support ticket (Enterprise)

Email / web form / `/ticket` / chatbot → ticket vào team → auto-assign (workload hoặc theo tag chuyên môn) → SLA → xử lý qua chatter → stage folded = đóng / Automatic Closing / khách tự đóng, rating. Cần bán thì Convert to Opportunity.

### C. Live chat

Rule khớp URL/quốc gia → nút chat → chatbot (theo `chatbot_enabled_condition`) → forward operator (theo chuyên môn, ngôn ngữ, tải, giới hạn phiên) → `discuss.channel` livechat với status/outcome → `/lead`, `/ticket` → rating, review link.

### D. Portal

Grant Access → khách vào `/my`: quotations (sent), orders (sale) của công ty mình, invoices, tickets (follow), subscriptions → ký/trả/decline, đóng/renew subscription, sửa thông tin. Link token dùng không cần tài khoản.

### Gợi ý ánh xạ cho Nova Agency (nhận xét, không phải nguồn)

- Một `res.partner` cho công ty/người/địa chỉ; một `crm.lead` cho lead/opportunity với `won_status` tường minh (19.0); một `sale.order` cho quotation/order/subscription.
- Phân quyền Odoo vẫn là own vs all theo `user_id` (kể cả bản ghi chưa gán), không theo team; ADR-0005 (team scope) chặt hơn.
- Stage chung hoặc dùng cho nhiều team (`team_ids` M2M ở 19.0).
- Portal 19.0 dựa vào `partner_id` của tài liệu thay vì follower: đơn giản hơn để mô phỏng.

---

## Nguồn

Source Community (GitHub, nhánh 19.0, raw), đã đọc:

- https://raw.githubusercontent.com/odoo/odoo/19.0/odoo/addons/base/models/res_partner.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/odoo/addons/base/security/base_security.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/odoo/addons/base/security/base_groups.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/odoo/addons/base/security/ir.model.access.csv
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_lead.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_stage.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_lost_reason.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_recurring_plan.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_team.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/crm_team_member.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/res_partner.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/models/res_config_settings.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/wizard/crm_lead_to_opportunity.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/security/crm_security.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/security/ir.model.access.csv
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/data/crm_stage_data.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm/data/crm_lost_reason_data.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/models/crm_team.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/models/crm_team_member.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/models/crm_tag.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/models/res_users.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/security/sales_team_security.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sales_team/security/ir.model.access.csv
- https://api.github.com/repos/odoo/odoo/contents/addons/sales_team/models?ref=19.0 (liệt kê file; tương tự cho `crm`, `sale_management`, `im_livechat`, `mail`)
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/models/sale_order.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/models/sale_order_line.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/models/product_template.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/models/res_partner.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/security/res_groups.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/security/ir_rules.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/security/ir.model.access.csv
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale/controllers/portal.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_crm/models/sale_order.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_crm/models/crm_lead.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_management/models/sale_order.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_management/models/sale_order_line.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_management/models/sale_order_template.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/sale_management/models/sale_order_template_line.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/product/models/product_template.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/product/models/product_pricelist.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/product/models/product_pricelist_item.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/models/mail_activity.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/models/mail_activity_type.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/models/mail_message.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/models/mail_followers.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/models/mail_tracking_duration_mixin.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/mail/security/mail_security.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/models/im_livechat_channel.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/models/im_livechat_expertise.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/models/chatbot_script.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/models/chatbot_script_step.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/models/discuss_channel.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/im_livechat/security/im_livechat_channel_security.xml
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm_livechat/models/chatbot_script_step.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm_livechat/models/discuss_channel.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/crm_livechat/models/crm_lead.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/portal/wizard/portal_wizard.py
- https://raw.githubusercontent.com/odoo/odoo/19.0/addons/portal/models/portal_mixin.py

Đối chiếu 18.0 (để lập mục "Khác so với 18.0"): cùng các đường dẫn trên với nhánh `18.0` (thêm `sale_management/models/sale_order_option.py`, `mail/models/mail_thread.py`), và `17.0/addons/sales_team/models/res_partner.py`.

Docs chính thức 19.0, đã đọc:

- https://www.odoo.com/documentation/19.0/applications/sales/crm/acquire_leads/convert.html
- https://www.odoo.com/documentation/19.0/applications/sales/crm/pipeline/lost_opportunities.html
- https://www.odoo.com/documentation/19.0/applications/sales/crm/track_leads/lead_scoring.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions/renewals.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions/upselling.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions/closing.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions/reports.html
- https://www.odoo.com/documentation/19.0/applications/sales/subscriptions/automatic_payments.html
- https://www.odoo.com/documentation/19.0/applications/services/helpdesk.html
- https://www.odoo.com/documentation/19.0/applications/services/helpdesk/overview/sla.html
- https://www.odoo.com/documentation/19.0/applications/services/helpdesk/overview/receiving_tickets.html
- https://www.odoo.com/documentation/19.0/applications/services/helpdesk/advanced/close_tickets.html
- https://www.odoo.com/documentation/19.0/applications/websites/livechat.html
- https://www.odoo.com/documentation/19.0/applications/websites/livechat/chatbots.html
- https://www.odoo.com/documentation/19.0/applications/websites/livechat/responses.html
- https://www.odoo.com/documentation/19.0/applications/general/users/user_portals.html
- https://www.odoo.com/documentation/19.0/applications/general/users/user_portals/portal_access.html

Không truy cập được ở 19.0: `sales/subscriptions/scheduled_actions.html` (404), `sales/subscriptions/automatic_alerts.html` (trang trống).
