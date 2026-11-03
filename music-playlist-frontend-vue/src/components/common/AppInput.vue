<template>
  <div class="sw-input-group" :class="{ 'has-error': Boolean(error), 'is-disabled': disabled }">
    <label v-if="label" class="sw-label font-mono">
      {{ label }}
      <span v-if="required" class="required-star">*</span>
    </label>

    <div class="input-wrapper">
      <span v-if="$slots.prefix" class="prefix-slot">
        <slot name="prefix"></slot>
      </span>

      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="$emit('update:modelValue', $event.target.value)"
        class="sw-input"
        v-bind="$attrs"
      />

      <span v-if="$slots.suffix" class="suffix-slot">
        <slot name="suffix"></slot>
      </span>
    </div>

    <span v-if="error" class="error-msg font-mono">{{ error }}</span>
    <span v-else-if="hint" class="hint-msg font-mono">{{ hint }}</span>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  error: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.sw-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.sw-label {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: 0.02em;
}

.required-star {
  color: var(--pg-coral);
  margin-left: 2px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.sw-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-sm);
  color: var(--pg-ink);
  font-size: 0.92rem;
  outline: none;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.sw-input:focus {
  border-color: var(--pg-cobalt);
  box-shadow: 3px 3px 0px var(--pg-cobalt);
}

.sw-input::placeholder {
  color: var(--pg-ink-muted);
}

.has-error .sw-input {
  border-color: var(--pg-coral);
  box-shadow: 3px 3px 0px var(--pg-coral);
}

.error-msg {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--pg-coral);
}

.hint-msg {
  font-size: 0.72rem;
  color: var(--pg-ink-muted);
}
</style>
