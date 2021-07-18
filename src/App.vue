<template>
  <div class="app-container">
    <ScrollPicker v-model="curIndex"/>
    <p>{{curIndex}}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ScrollPicker from './components/ScrollPicker/ScrollPicker.vue';

export default defineComponent({
  name: 'App',
  components: {
    ScrollPicker
  },
  setup(){
    const curIndex = ref(5)
    return {
      curIndex
    }
  }
});
</script>

<style lang="stylus">
.app-container
  background #F6F6F6
  max-width 350px
  display flex
  flex-direction column
  padding 30px 

</style>
