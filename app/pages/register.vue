<script setup lang="ts">
import { useCaroGame } from "~/composables/useCaroGame";

const { isLoading } = useCaroGame();
const supabase = useSupabaseClient();

const username = ref("");
const email = ref("");
const password = ref("");
const displayName = ref("");
const errorMsg = ref("");

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    errorMsg.value = "Vui lòng nhập đầy đủ các trường bắt buộc.";
    return;
  }

  errorMsg.value = "";
  isLoading.value = true;

  try {
    // 1. Check if username is already taken in profiles
    const { data: existingUser } = await (supabase.from("profiles") as any)
      .select("username")
      .eq("username", username.value)
      .single();

    if (existingUser) {
      errorMsg.value = "Username này đã được sử dụng.";
      return;
    }

    // 2. Sign up
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          username: username.value,
          display_name: displayName.value || username.value,
        },
      },
    });

    if (error) {
      errorMsg.value = error.message;
    } else {
      // Success - redirect to home or show check email notice
      navigateTo("/");
    }
  } catch (err) {
    errorMsg.value = "Có lỗi xảy ra trong quá trình đăng ký.";
  } finally {
    isLoading.value = false;
  }
};

const inputClass =
  "w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent";
const primaryButtonClass =
  "w-full rounded-xl bg-caro-accent px-6 py-4 font-bold text-caro-bg-deep transition duration-200 hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(116,181,134,0.3)] disabled:opacity-50";
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center py-12 px-4">
    <div
      class="w-full max-w-md space-y-8 rounded-[32px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-8 md:p-10 backdrop-blur-[24px] shadow-2xl"
    >
      <div class="text-center">
        <h2 class="text-3xl font-bold text-white mb-2">Tham gia MultiChess</h2>
        <p class="text-[rgba(231,243,235,0.6)]">Tạo tài khoản để lưu giữ thành tích vĩnh viễn.</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleRegister">
        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent mb-2">Username *</label>
          <input
            v-model="username"
            type="text"
            placeholder="Ví dụ: kythu_01"
            :class="inputClass"
            required
            minlength="3"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent mb-2">Email *</label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            :class="inputClass"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent mb-2">Mật khẩu *</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            :class="inputClass"
            required
            minlength="6"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent mb-2">Tên hiển thị (Tùy chọn)</label>
          <input
            v-model="displayName"
            type="text"
            placeholder="Ví dụ: Đại Sư Cờ"
            :class="inputClass"
          />
        </div>

        <div v-if="errorMsg" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
          {{ errorMsg }}
        </div>

        <button :class="primaryButtonClass" :disabled="isLoading">
          <span v-if="isLoading">Đang đăng ký...</span>
          <span v-else>Đăng ký ngay</span>
        </button>

        <p class="text-center text-sm text-[rgba(231,243,235,0.5)]">
          Đã có tài khoản?
          <NuxtLink to="/login" class="text-caro-accent hover:underline font-bold">Đăng nhập</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
